# ms-365-mcp-server

Self-hosted MCP server exposing Microsoft Graph (mail, calendar, OneDrive, SharePoint, Teams)
to Areté's agents over Streamable HTTP. It is its own OAuth broker: Entra is upstream, MCP
clients register with the server via DCR. Node 24, TypeScript, Express, better-sqlite3.
Repo is `aretecp/ms-365-mcp-server` — it has not moved to Lumist-Labs.

## Commands (match `.github/workflows/ci.yml`)

```bash
npm ci
npm run verify      # lint + format:check + build + test — exactly what CI runs
npm run dev:http    # local server on 127.0.0.1:3000 (needs .env, see README "Quick start")
npm test            # vitest
npm run format      # prettier --write; CI fails on format drift
```

## Layout

| Path                          | What                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `src/index.ts`                | Boot: loads policy (`PolicyManager.fromFile`), admin allowlist, SIGHUP reload             |
| `src/server.ts`               | Express app: OAuth broker endpoints, `/mcp`, admin router, CORS                           |
| `src/tools/*.ts`              | Hand-written tool definitions, one file per domain; `index.ts::ALL_TOOLS`                 |
| `src/tool-runtime.ts`         | `executeTool` / `registerTools`: policy check, precondition, Graph call, response shaping |
| `src/toolset-config.ts`       | Which toolsets register (`MS365_MCP_TOOLSETS`; unset = core only)                         |
| `src/policy/index.ts`         | Per-user allow/deny policy and the `mailSend` same-domain guard                           |
| `src/oauth/`, `src/sessions/` | DCR client registry, broker state, encrypted session store                                |
| `src/admin/`                  | Cookie-auth admin UI: policy editor, tool-call log                                        |
| `policy/policy.yaml.example`  | Default policy: full read surface, no writes                                              |
| `test/`                       | vitest suites                                                                             |

## Invariants — do not weaken

- **Tool descriptions are not a security control.** Anything that must hold is a
  `Tool.precondition` or a server-built body in `Tool.execute` (`src/tools/types.ts`), run by
  `src/tool-runtime.ts`; a throw refuses the call. The README's _Server-enforced invariants_
  tables list them.
- **Same-domain send.** `mail-draft-send` and `mail-send` refuse unless the sender and every
  recipient share one domain (and it is on `mailSend.allowedDomains` if set):
  `src/tools/mail.ts::assertSendWithinDomain` / `::assertDirectSendWithinDomain` →
  `src/policy/index.ts::evaluateMailSend`. `requireSameDomain` defaults to true
  (`DEFAULT_MAIL_SEND_CONFIG`).
- **Draft-only mail writes, organizer-only calendar writes** — `assertIsDraft`,
  `assertIsOrganizer`. `Mail.ReadWrite` / `Calendars.ReadWrite` are broader than we expose.
  One deliberate exception: `mail-message-categories-modify` / `mail-thread-categories-modify`
  tag any message, and their handlers PATCH `{ categories }` only. Probes read Graph via
  `graphClient.makeRequest` (raw object), never `graphRequest` (MCP envelope).
- **Policy fails closed.** `user.deny > user.allow > defaults.allow > deny`. Every write tool
  stays off `defaults.allow`. Policy keys on `tool.name`, so renaming a tool is a policy break.
- **Delegated permissions only.** No app-only Graph tokens.

## Deploy shape

- Shared VPS, Docker Compose + Traefik. Prod `m365.mcp.areteintelligence.ai`
  (`docker-compose.prod.yml`), dev `m365.mcp.dev.areteintelligence.ai`
  (`docker-compose.dev.yml`). Staying on `areteintelligence.ai` is deliberate.
- `deploy-prod.yml` / `deploy-dev.yml` / `rollback-prod.yml` are **hand-rolled** SSH-over-Tailscale
  jobs on `ubuntu-latest`, not the shared `deploy-vps-shared.yml`.
- Secrets: Infisical internal project `/m365-mcp` (app) and shared project `/tailscale` (SSH +
  tailnet), loaded by OIDC. The deploy writes `.env` on the VPS; compose maps names to `MS365_MCP_*`.
- Entra app: `apps/m365_mcp/` in `Lumist-Labs/microsoft-entra-terraform-infrastructure`.
  DNS: `m365-mcp/` in `Lumist-Labs/lumist-terraform-infrastructure`.
- Full procedure, secrets table, rotation, troubleshooting: `docs/DEPLOYMENT.md`.

## Gotchas

- The firm Entra app registers no `localhost:3000/auth/callback` (`apps/m365_mcp/main.tf`), so a
  full OAuth sign-in against a local server needs that URI added or your own app registration.
- Logs go to files under `$MS365_MCP_LOG_DIR` (default `~/.ms-365-mcp-server/logs`), not stdout,
  unless started with `-v`.
- `better-sqlite3` is native; the Docker build stage carries the toolchain for it.

## Docs

| Doc                      | For                                                          |
| ------------------------ | ------------------------------------------------------------ |
| `README.md`              | Tool surface, Entra scopes, invariants table, CLI, auth flow |
| `docs/DEPLOYMENT.md`     | Deploy, secrets, operations                                  |
| `docs/SECURITY-AUDIT.md` | Tool-surface security audit                                  |
| `docs/solutions/`        | Recorded patterns and bug post-mortems                       |
