# Deployment Guide

Self-hosted Areté Microsoft 365 MCP server. Single instance per environment, single Entra
tenant, state on disk.

|                 | Prod                                                 | Dev                                                 |
| --------------- | ---------------------------------------------------- | --------------------------------------------------- |
| Public hostname | `m365.mcp.areteintelligence.ai`                      | `m365.mcp.dev.areteintelligence.ai`                 |
| Compose file    | `docker-compose.prod.yml` (container `m365_mcp`)     | `docker-compose.dev.yml` (container `m365_mcp_dev`) |
| Deploy trigger  | release published / `v*.*.*` tag (`deploy-prod.yml`) | push to `develop` (`deploy-dev.yml`)                |
| Infisical env   | `prod`                                               | `dev`                                               |

The hostnames stay on `areteintelligence.ai` on purpose. `lumist-terraform-infrastructure`'s
`m365-mcp/route53.tf` says the service is not moving to lumistlabs, and the comment in
`docker-compose.dev.yml` records that the rename was decided against. The Entra app also
registers `m365-mcp.lumistlabs.*` redirect URIs; nothing serves those hosts.

Out of scope: multi-region, multi-pod, blue/green. Sessions are per-pod SQLite and policy
reload is in-process, so the design is single-pod.

---

## 1. Architecture at a glance

```
   Public DNS (Route 53)
      m365.mcp.areteintelligence.ai  →  shared VPS
                                                │
                                                ▼
                          ┌──────────────────────────────────────┐
                          │ Traefik (websecure / Let's Encrypt)  │
                          │   security-headers@file              │
                          │   rate-limit@file                    │
                          └──────────────────┬───────────────────┘
                                             │  aichat_openwebui-network
                                             ▼
            ┌─────────────────────────────────────────────────┐
            │ m365-mcp container  (port 3000)                 │
            │                                                 │
            │  /.well-known/oauth-authorization-server        │
            │  /.well-known/oauth-protected-resource          │
            │  /register /authorize /token /revoke            │
            │  /admin/...   ← cookie-auth, policy YAML editor │
            │  /mcp        ← Streamable HTTP MCP, bearer auth │
            └────────┬────────────────────────────────────────┘
                     │ delegated OAuth (PKCE, brokered)
                     ▼
              login.microsoftonline.com (Areté tenant)
                     │
                     ▼
              graph.microsoft.com

   On-disk state (named docker volumes, never shared across pods):
     /data/sessions.db        SQLite, AES-256-GCM encrypted token blobs + oauth_clients
     /policy/policy.yaml      YAML, hot-reloaded via SIGHUP / admin UI
```

Three things must persist across restarts:

1. **`/data/sessions.db`** — refresh tokens and DCR client registrations. Lose it and every
   user re-OAuths.
2. **`/policy/policy.yaml`** — per-user allow/deny rules and the `mailSend` block.
3. **`MS365_MCP_SESSION_KEY`** — the AES-256 key encrypting session blobs (also used to sign admin
   CSRF tokens and contacts-tool pagination cursors — same key, different HMAC use each time).
   Change it and every existing session is unreadable and every outstanding contacts cursor is
   refused (callers just restart pagination from the beginning — not a data-loss mode). Treat it
   like a database master key.

The volumes are `m365_mcp_data` / `m365_mcp_policy` (prod) and `m365_mcp_data_dev` /
`m365_mcp_policy_dev` (dev), declared in the compose files. Compose prefixes them with the
project name, which defaults to the checkout directory (`ms-365-mcp-server`).

---

## 2. Where each piece lives

| Piece                  | Owner                                                                                                                                                      | Notes                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entra app registration | [`Lumist-Labs/microsoft-entra-terraform-infrastructure`](https://github.com/Lumist-Labs/microsoft-entra-terraform-infrastructure), `apps/m365_mcp/main.tf` | Terraform Cloud, workspaces `microsoft-entra-terraform-infrastructure-prod` (tracks `main`) and `-dev` (tracks `develop`). Never hand-edit the app in the portal |
| DNS A records          | [`Lumist-Labs/lumist-terraform-infrastructure`](https://github.com/Lumist-Labs/lumist-terraform-infrastructure), `m365-mcp/route53.tf`                     | S3 state; applied by that repo's `terraform.yml` on push (`develop` → dev account, `main` → prod). TLS is Traefik, no ACM                                        |
| App secrets            | Infisical internal project, path `/m365-mcp`                                                                                                               | Client id/secret/tenant pushed by the Entra repo's `infisical_entra_secrets` module; two keys entered by hand (§3)                                               |
| Tailscale + SSH creds  | Infisical shared project, path `/tailscale`                                                                                                                | `TAILSCALE_AUTHKEY`, `VPS_SSH_KEY`, `VPS_TAILSCALE_IP`                                                                                                           |
| Code checkout          | VPS, `$HOME/ms-365-mcp-server`                                                                                                                             | One checkout; prod and dev stacks run from it                                                                                                                    |
| Deploy workflows       | `.github/workflows/` in this repo                                                                                                                          | Hand-rolled SSH deploy, see §5                                                                                                                                   |

### Entra app

The app is a confidential client with delegated permissions only. The full permission list and
redirect URIs are in `apps/m365_mcp/main.tf` in the Entra repo — read it there rather than a
copy here. Points that matter for operating this server:

- **Redirect URIs.** The broker needs exactly one per host: `https://<host>/auth/callback`,
  plus `https://<host>/admin/callback` for the admin UI. Both hosts are registered on one app.
  The `claude.ai` and loopback entries are legacy pass-through rows, kept only until every
  client is confirmed on DCR.
- **Admin consent is manual.** Terraform requests the scopes; a tenant admin must click
  "Grant admin consent" in Entra → App registrations → API permissions after any permission
  change. The README's _Entra app setup_ section lists which scopes need it.
- **After apply**, Infisical `/m365-mcp` (both `prod` and `dev`) should hold
  `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`.

---

## 3. Secrets

| Infisical key (`/m365-mcp`) | Server env var            | Source                                                                                       |
| --------------------------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| `MICROSOFT_CLIENT_ID`       | `MS365_MCP_CLIENT_ID`     | Entra repo, automatic                                                                        |
| `MICROSOFT_CLIENT_SECRET`   | `MS365_MCP_CLIENT_SECRET` | Entra repo, automatic                                                                        |
| `MICROSOFT_TENANT_ID`       | `MS365_MCP_TENANT_ID`     | Entra repo, automatic                                                                        |
| `MS365_MCP_SESSION_KEY`     | `MS365_MCP_SESSION_KEY`   | Manual, in both `prod` and `dev`: `openssl rand -base64 32`, a different key per environment |
| `MS365_MCP_POLICY_ADMINS`   | `MS365_MCP_POLICY_ADMINS` | Manual: comma-separated UPNs allowed into the admin UI                                       |

The mapping from Infisical names to `MS365_MCP_*` happens in the compose files'
`environment:` block. Each value uses `${X:?X is required}`, so compose refuses to start if the
`.env` the deploy wrote is missing one. The server itself also fails fast on a missing
`MS365_MCP_POLICY_ADMINS` (`src/index.ts::loadPolicyAdmins`) or a session key that doesn't
decode to 32 bytes.

Other runtime settings are fixed in `docker-compose.prod.yml`: `MS365_MCP_PUBLIC_URL`,
`MS365_MCP_ALLOWED_REDIRECT_URIS` (legacy allowlist for non-DCR clients — Claude.ai),
`MS365_MCP_TOOLSETS=all`, `MS365_MCP_OUTPUT_FORMAT=toon`. `MS365_MCP_CORS_ORIGIN` is left
unset on purpose in prod (permissive CORS so any MCP client connects).

`docker-compose.dev.yml` differs: it sets no `MS365_MCP_TOOLSETS` (so dev registers the core
read tools only, and write tools can't be exercised there) and pins `MS365_MCP_CORS_ORIGIN` to
`https://claude.ai`.

---

## 4. The container image

`Dockerfile` is a multi-stage `node:24-bookworm-slim` build:

- Build stage has the C++ toolchain for `better-sqlite3`.
- Runtime stage copies only `dist/`, prod `node_modules`, and `policy.yaml.example` (to
  `/app`, so it survives the `/policy` volume mount). Runs as `node`.
- Sets `MS365_MCP_SESSION_DB_PATH=/data/sessions.db` and `MS365_MCP_POLICY_PATH=/policy/policy.yaml`.
- `CMD` copies `/app/policy.yaml.example` to `/policy/policy.yaml` when the volume has none,
  then starts `node dist/index.js --http 0.0.0.0:3000`. A fresh volume therefore boots with
  the example policy: full read surface, no writes.

Build and run locally:

```bash
docker build -t m365-mcp-server:dev .

docker run --rm -p 3000:3000 \
  -e MS365_MCP_CLIENT_ID=... \
  -e MS365_MCP_TENANT_ID=... \
  -e MS365_MCP_CLIENT_SECRET=... \
  -e MS365_MCP_SESSION_KEY=... \
  -e MS365_MCP_POLICY_ADMINS=you@aretepartners.com \
  -v m365-mcp-policy:/policy \
  -v m365-mcp-data:/data \
  m365-mcp-server:dev
```

`curl localhost:3000/.well-known/oauth-authorization-server` should return JSON.

---

## 5. Deploy pipeline

This repo does **not** use the shared `deploy-vps-shared.yml`. Every deploy workflow is a
hand-rolled job on `ubuntu-latest` that joins the tailnet and runs a script over SSH. It gets
none of `vps-deploy-core`'s protections, which is why `deploy-prod.yml` carries its own
org-move remote repointing and job-token git credential.

| Workflow            | Trigger                                                     | What it does                                                                                                                                                      |
| ------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`            | push / PR to `main` or `develop`                            | `npm ci`, lint, `format:check`, build, test (same as `npm run verify`)                                                                                            |
| `release.yml`       | push to `main`, or dispatch                                 | Calls `Lumist-Labs/github-actions/.github/workflows/release-shared.yml@v2`: semantic-release cuts the tag + GitHub Release                                        |
| `deploy-prod.yml`   | release published, `v*.*.*` tag, or dispatch with `version` | Loads Infisical, joins Tailscale, SSHes in, writes `.env`, checks out the tag, `docker compose -f docker-compose.prod.yml up -d --build`, then `wait-for-healthy` |
| `deploy-dev.yml`    | push to `develop`, or dispatch with `branch`                | Same shape with `docker-compose.dev.yml` and `.env.dev`. Clones the repo on first run                                                                             |
| `rollback-prod.yml` | dispatch with `version`                                     | Same shape, checks out the given tag                                                                                                                              |

Shared actions used: `load-infisical-secrets@v2`, `tailscale-connect@v1` (pinned behind `v2`),
`wait-for-healthy@v2`, all from `Lumist-Labs/github-actions`.

### Secret flow (CI → `.env` → compose)

1. `load-infisical-secrets` (OIDC, no static credentials) loads `/tailscale` from the shared
   project and `/m365-mcp` from the internal project. The shared load is scoped to `/tailscale`,
   not the root: a recursive root load flattens every subfolder by key name, and `/vps/gateway`
   defines `VPS_SSH_KEY` / `VPS_TAILSCALE_IP` for a different host.
2. The runner joins the tailnet and SSHes to `VPS_TAILSCALE_IP` as `vars.VPS_USER`.
3. The script writes `.env` (`chmod 600`) (`.env.dev` on dev) with the five secrets plus `PUBLIC_HOSTNAME`,
   `ENVIRONMENT` (and `VERSION` on prod), then brings the stack up.

GitHub variables the workflows read:

| Variable                                                           | Scope                                            |
| ------------------------------------------------------------------ | ------------------------------------------------ |
| `INFISICAL_OIDC_IDENTITY_ID`                                       | org-level                                        |
| `INFISICAL_SHARED_PROJECT_SLUG`, `INFISICAL_INTERNAL_PROJECT_SLUG` | repo-level                                       |
| `VPS_USER`                                                         | environment-level (`production` / `development`) |

A missing variable resolves to an empty string, and the Infisical step fails much later than
where the cause is.

### First-time bootstrap (prod)

Prod refuses to clone — `deploy-prod.yml` exits with "REPO_DIR does not exist" until an
operator clones once:

```bash
ssh <vps-user>@<vps-tailscale-ip>
git clone https://github.com/aretecp/ms-365-mcp-server.git ~/ms-365-mcp-server
```

After that CI owns `.env`, checkout, compose and the health gate. Dev clones itself on first
run. Traefik provisions the certificate on the first HTTPS request, so DNS must already
resolve (`dig +short m365.mcp.areteintelligence.ai`).

---

## 6. Policy

The first boot on an empty volume installs the example policy (§4): full read surface in
`defaults.allow`, **all writes off**. Grant writes per user through the admin UI
(`/admin/policy`), or by editing `/policy/policy.yaml` in the volume and sending SIGHUP.

**Adding a tool to `policy/policy.yaml.example` in this repo does not touch an already-deployed
`/policy/policy.yaml` on the volume** — the example is only copied in on a fresh, empty volume
(§4). A new read tool (e.g. the `contact-*` tools) registers under `CORE_TOOL_NAMES` regardless,
but `policy.check` fails closed on anything not in the live `defaults.allow`/a user's `allow`, so
it is reachable-but-denied until an operator edits the live file (or the admin UI) and reloads.
After adding a new tool here, check whether `defaults.allow` on each running deployment needs the
same addition.

**Rolling out a new scope (e.g. `Contacts.Read`) is a three-step, strictly-ordered sequence — doing
only the first two leaves every already-connected agent unable to use the new tool:**

1. **Entra**: add the delegated permission to the app registration and grant tenant admin consent
   where required (§2 — Terraform requests the permission, a human still has to click "Grant admin
   consent"; the README's _Entra app setup_ table lists which scopes need it, with the caveat that
   a tenant's own consent policy can force admin consent even for a not-bold scope).
2. **Active policy**: add the new tool to the live `/policy/policy.yaml` `defaults.allow` (or a
   user's `allow`) and reload — admin UI save, or edit + SIGHUP. The example file alone does
   nothing for a running deployment (previous paragraph).
3. **Reconnect every already-signed-in client.** This step is easy to miss: a session's access
   token is refreshed via `grant_type=refresh_token` with no `scope` parameter
   (`src/lib/microsoft-auth.ts::refreshAccessToken`), so Entra returns a token with the **same**
   scopes the session originally consented to — a silent refresh never picks up a scope added to
   the app registration after that session's original sign-in. Each existing MCP client must fully
   re-run the OAuth flow (sign out and back in, or revoke+reconnect) to get a token that actually
   includes the new scope; until then its calls to the new tool fail with a Graph permission error
   even though steps 1–2 are both done.

**This release** adds the delegated `Files.ReadWrite.All` scope (drive-\* writes) on top of
#63's `MailboxSettings.Read`/`MailboxSettings.ReadWrite`, `Calendars.Read.Shared`,
`People.Read`, and `Chat.Create`. All of these are requested by the Entra app registration
itself (`apps/m365_mcp/main.tf`), so every deployment gets them regardless of
`MS365_MCP_TOOLSETS` — the toolset only gates which tools register, not which scopes the app
asks for. Apply the Entra Terraform change
([Lumist-Labs/microsoft-entra-terraform-infrastructure#208](https://github.com/Lumist-Labs/microsoft-entra-terraform-infrastructure/pull/208))
and grant tenant admin consent in each environment **before** deploying this server version,
then have users reconnect per step 3 above — otherwise sign-in itself can fail once the server
requests a scope the app registration doesn't have yet.

A day-one shape for a power user:

```yaml
defaults:
  allow: [... full read surface from policy.yaml.example ...]

users:
  slyon@aretepartners.com:
    allow:
      # Mail writes
      - mail-draft-create
      - mail-message-update
      - mail-attachment-add
      - mail-message-delete
      # Mail send — still subject to the mailSend same-domain guard below
      - mail-draft-send
      - mail-send
      # Calendar writes (update/delete refuse non-organizer events)
      - calendar-event-create
      - calendar-event-update
      - calendar-event-delete
      # Teams writes
      - teams-chat-message-send
      - teams-channel-message-send
      - teams-channel-message-reply-send
      - teams-online-meeting-create
      - teams-online-meeting-update
      - teams-online-meeting-delete

# Same-domain send guard for mail-draft-send and mail-send. Even users allowed the
# tool can only send when the sender + every recipient are in an allowed domain.
mailSend:
  requireSameDomain: true
  allowedDomains:
    - aretepartners.com
```

Tool names must match the registered surface (`src/tools/index.ts::ALL_TOOL_NAMES`) — the admin
UI rejects unknown names on save (`src/admin/router.ts`, via
`src/policy/index.ts::findUnknownPolicyTools`).

The same-domain guard is enforced in code, not by tool descriptions: `mail-draft-send` and
`mail-send` carry preconditions (`src/tools/mail.ts::assertSendWithinDomain`,
`::assertDirectSendWithinDomain`) that call `src/policy/index.ts::evaluateMailSend`, and
`src/tool-runtime.ts` refuses the call before Graph is touched.

SIGHUP on the VPS:

```bash
docker compose -f docker-compose.prod.yml kill -s HUP m365-mcp
docker compose -f docker-compose.dev.yml kill -s HUP m365-mcp-dev   # dev
```

---

## 7. First-user verification

Run in order after a fresh deploy:

1. **Discovery endpoints answer.**

   ```bash
   curl -s https://m365.mcp.areteintelligence.ai/.well-known/oauth-authorization-server | jq .
   curl -s https://m365.mcp.areteintelligence.ai/.well-known/oauth-protected-resource    | jq .
   ```

   Both 200, `issuer` / `authorization_endpoint` / `registration_endpoint` on the public URL.

2. **Admin UI loads.** `https://m365.mcp.areteintelligence.ai/admin/login` → Microsoft sign-in
   → `/admin/policy` with the YAML.
3. **Edit + save.** Add a comment, save, see the "Saved" banner. The server log gets
   `policy.saved` (the log format drops metadata, so no UPN appears in the line).
4. **Connect an MCP client** (§8) and run a read tool.
5. **Confirm a write is gated.** Call a write tool before granting it; expect a policy refusal.
   Grant it in the admin UI; retry without a restart.
6. **Confirm SIGHUP.** Edit the file in the volume, send SIGHUP, and look for
   `Policy reloaded from /policy/policy.yaml` in the log.

---

## 8. Connecting MCP clients

The server is an OAuth broker with Dynamic Client Registration, so **most clients need only the
URL**: `https://m365.mcp.areteintelligence.ai/mcp`. The client discovers `/register`, gets its
own `client_id`, and runs Authorization Code + PKCE. No per-client Entra entries.

- **Claude.ai (web)** — Settings → Integrations → add the `/mcp` URL. Claude.ai uses the fixed
  redirect `https://claude.ai/api/mcp/auth_callback`, covered by `MS365_MCP_ALLOWED_REDIRECT_URIS`.
- **MCP Inspector, MCP Jam, Cursor and other DCR clients** — paste the URL and authorize. Their
  loopback callbacks need no allowlist entry.
- **Claude Code** — `claude mcp add --transport http arete-m365 https://m365.mcp.areteintelligence.ai/mcp`.
  If it does not perform DCR, add its loopback callback to `MS365_MCP_ALLOWED_REDIRECT_URIS`.
- **Claude Desktop** — same redirect story as Claude Code. In `claude_desktop_config.json`:

  ```json
  { "mcpServers": { "arete-m365": { "url": "https://m365.mcp.areteintelligence.ai/mcp" } } }
  ```

---

## 9. Day-two operations

### Logs

The server logs with winston to files, not stdout: `error.log` and `mcp-server.log` under
`$MS365_MCP_LOG_DIR` (default `~/.ms-365-mcp-server/logs`, i.e. `/home/node/...` in the
container). Console logging turns on only with `-v`, which the image's `CMD` does not pass, so
`docker compose logs` shows little. The log directory is not on a volume and does not survive a
recreate.

```bash
docker exec m365_mcp tail -f /home/node/.ms-365-mcp-server/logs/mcp-server.log
```

Per-call tool outcomes are also recorded for the admin UI (`src/admin/tool-call-log.ts`).

Look for:

- `policy.saved` — every admin-UI save.
- `Policy reloaded from <path>` — any successful reload, admin-UI save or SIGHUP.
- `Rejected /authorize with unregistered redirect_uri` — a DCR client sent a URI it did not
  register (client bug), or a non-DCR client's URI is not in `MS365_MCP_ALLOWED_REDIRECT_URIS`.

Access tokens refresh transparently when within 5 minutes of expiry
(`src/sessions/manager.ts`, `REFRESH_SKEW_MS`).

### Upgrades

- **Prod** — a human merges `develop → main`; `release.yml` cuts a tag; `deploy-prod.yml` fires
  on the release. Manual: `gh workflow run deploy-prod.yml -f version=v1.2.3`. A manual run with
  no `version` deploys `main`.
- **Dev** — push to `develop`.

Sessions and policy live in the named volumes, so upgrades keep them.

### Rollback

```bash
gh workflow run rollback-prod.yml -f version=v1.2.2
```

Re-writes `.env`, checks out the tag, rebuilds. Sessions and policy are untouched. It shares the
`deploy-prod` concurrency group, so it queues behind a running deploy.

### Rotating secrets

| Secret                    | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Blast radius                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `MICROSOFT_CLIENT_SECRET` | In the Entra repo the app has two credential slots. `terraform apply -replace` the **inactive** slot (`module.m365_mcp.module.app_registration.azuread_application_password.slot["<a\|b>"]`), flip the pointer (`active_slot` in the `-prod` workspace, `dev_active_slot` in `-dev` — `apps/m365_mcp/main.tf` sets neither today, so add it to the module call), apply, then redeploy here so the new value lands in `.env`. Never replace the active slot; never use `terraform taint`. See that repo's `modules/app_registration/README.md` | None if done in that order                      |
| `MS365_MCP_SESSION_KEY`   | New key in Infisical, redeploy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Every session invalidated; all users re-sign-in |
| `MS365_MCP_POLICY_ADMINS` | Update Infisical, redeploy (read at start only)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Admin UI access only                            |

### Backups

**No backup of `sessions.db` or `policy.yaml` is automated in this repo.** Whether the VPS
snapshots the docker volumes is **unknown**. Losing `sessions.db` forces every user to re-OAuth
and every DCR client to re-register; losing `policy.yaml` resets to the example (reads only).
Keep a copy of the policy YAML outside the box.

### Monitoring

- Uptime probe on `/.well-known/oauth-authorization-server` — the container healthcheck uses
  the same endpoint.
- Disk on the `/data` volume.
- Graph 429s: there is no throttling/backoff yet —
  [`aretecp/ms-365-mcp-server#8`](https://github.com/aretecp/ms-365-mcp-server/issues/8).

---

## 10. Before a deploy

- Admin consent granted for every scope that needs it. Without it discovery works and the first
  tool call fails. Check the README's _Entra app setup_ table against `apps/m365_mcp/main.tf` in
  the Entra repo for any scope this deploy newly requires (e.g. `Contacts.Read`) — Terraform
  requests it, but admin consent is still a manual click per §2.
- If this deploy adds a scope: the live `policy.yaml` `defaults.allow`/a user's `allow` updated and
  reloaded, AND every already-connected client told to reconnect/re-run OAuth — see §6, step 3. A
  silent token refresh does not pick up a newly added scope.
- `MS365_MCP_SESSION_KEY` and `MS365_MCP_POLICY_ADMINS` present in Infisical for the environment.
- DNS resolves to the VPS.
- `npm run verify` green on the ref being deployed.

---

## 11. Troubleshooting

| Symptom                                                          | Likely cause                                                                                           | First check                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `AADSTS65001: The user or administrator has not consented`       | Missing admin consent                                                                                  | Entra → App registrations → API permissions → Grant admin consent                    |
| `redirect_uri is not registered for this client` at `/authorize` | DCR client's URI not among its registered set, or non-DCR URI not in `MS365_MCP_ALLOWED_REDIRECT_URIS` | DCR: client re-registers. Legacy: add to the allowlist in the compose file, redeploy |
| `no usable CIMD or DCR flow` in the client                       | Client hit the wrong URL or a build without `/register`                                                | `/.well-known/oauth-authorization-server` must advertise `registration_endpoint`     |
| `AADSTS50011: redirect URI mismatch`                             | `…/auth/callback` for this host not on the Entra app                                                   | Add it in `apps/m365_mcp/main.tf` in the Entra repo and apply                        |
| Admin UI 401 right after sign-in                                 | `Secure` cookie over plain http                                                                        | Traefik must forward `X-Forwarded-Proto: https`                                      |
| Admin UI 403                                                     | UPN not in `MS365_MCP_POLICY_ADMINS`                                                                   | Update Infisical, redeploy                                                           |
| `/mcp` 401 with `WWW-Authenticate: Bearer`                       | Session expired or revoked                                                                             | Client re-runs OAuth. Expected after a session-key rotation                          |
| Won't start: `MS365_MCP_POLICY_ADMINS is required`               | Env var empty                                                                                          | Set it in Infisical                                                                  |
| Won't start: session key "must decode to 32 bytes"               | Wrong key length                                                                                       | `openssl rand -base64 32`                                                            |
| Tool call returns 429                                            | No backoff yet (#8)                                                                                    | Back off client-side                                                                 |
| `deploy-prod.yml`: "REPO_DIR does not exist"                     | Prod refuses to clone                                                                                  | §5 First-time bootstrap                                                              |
| Tailscale step: "node already exists"                            | Stale auth key reuse                                                                                   | Rotate `TAILSCALE_AUTHKEY` in the shared project's `/tailscale`                      |
| Workflow can't read Infisical                                    | OIDC identity lacks access, or a GitHub variable is missing                                            | Check the three variables in §5                                                      |
| SSH handshake fails after an Infisical change                    | Shared load widened past `/tailscale`                                                                  | Keep the shared load scoped to `/tailscale`                                          |

---

## 12. References

- Entra app: [`Lumist-Labs/microsoft-entra-terraform-infrastructure`](https://github.com/Lumist-Labs/microsoft-entra-terraform-infrastructure) — `apps/m365_mcp/`
- DNS: [`Lumist-Labs/lumist-terraform-infrastructure`](https://github.com/Lumist-Labs/lumist-terraform-infrastructure) — `m365-mcp/`
- Shared actions: [`Lumist-Labs/github-actions`](https://github.com/Lumist-Labs/github-actions)
- Throttling backlog: [`aretecp/ms-365-mcp-server#8`](https://github.com/aretecp/ms-365-mcp-server/issues/8)
- Security audit: [`SECURITY-AUDIT.md`](SECURITY-AUDIT.md)
- Microsoft Graph permissions: <https://learn.microsoft.com/en-us/graph/permissions-reference>
- Microsoft Graph throttling: <https://learn.microsoft.com/en-us/graph/throttling>
