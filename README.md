# Areté Microsoft 365 MCP Server

Self-hosted [Model Context Protocol](https://modelcontextprotocol.io) server that exposes Microsoft Graph (Outlook mail, Outlook calendar, OneDrive, SharePoint, Teams) to Areté's LLM agents over a single multi-tenant-aware HTTP endpoint.

Originally forked from [Softeria/ms-365-mcp-server](https://github.com/Softeria/ms-365-mcp-server) and rewritten for our deployment model. Areté now owns this codebase; upstream is a reference, not a dependency.

Hosted on VPS

## Status

Hand-written tool surface. Currently exposing:

- **Mail**: read + draft (new, reply, reply-all, forward) + delete drafts + **same-domain send** (Outlook). Send is allowed only when the sender and every recipient share one domain — see [Same-domain Mail.Send](#same-domain-mailsend). Categories (Outlook's labels): manage the master list and add/remove categories on any message or whole thread — the one write allowed on received mail, limited to `categories`.
- **Calendar**: read + keyword search + free/busy (`calendar-schedule-get`) + suggested times (`calendar-meeting-times-find`) + create + update + delete events.
- **Files (OneDrive + SharePoint)**: read, plus guarded writes — upload a new file, update content (eTag required), create folder, rename, move/copy within one drive, delete single files.
- **SharePoint**: sites, document libraries, lists, and file/folder search across OneDrive + SharePoint (`sharepoint-search`) — read-only.
- **Teams**: chats (create + read + send), channels (read + send), online meetings (find + create + update + delete), transcripts (read).
- **Directory**: `identity-get-me`, `user-search`, `user-get`, `people-search` (relevance-ranked people incl. external correspondents).
- **Contacts**: read-only — compact listing, full detail (including `personalNotes`/`categories`), complete nested contact-folder discovery. No writes, no delta/sync.
- **Utilities**: `download-bytes`, `parse-teams-url`, `identity-granted-scopes-get` (scopes this session's token carries vs. what the server requests).

Per-user OAuth sessions in SQLite. Per-user, per-tool policy in YAML with admin UI + SIGHUP reload. HTTP transport only.

## Requirements

- Node.js 24+
- An Entra ID app registration in your tenant (delegated permissions only). Several Teams scopes require admin consent — see **Entra app setup** below.

## Quick start (development)

```bash
# Set up secrets
cat > .env <<'EOF'
MS365_MCP_CLIENT_ID=<your Entra app client ID>
MS365_MCP_TENANT_ID=<your tenant ID>
# Optional confidential-client secret
MS365_MCP_CLIENT_SECRET=<secret if used>
MS365_MCP_SESSION_KEY=<openssl rand -base64 32>
MS365_MCP_POLICY_ADMINS=<your UPN>
EOF

cp policy/policy.yaml.example policy/policy.yaml

npm install
npm run dev:http   # binds 127.0.0.1:3000
```

## Entra app setup

Delegated permissions needed for the full v1.5 surface. **Bold scopes need admin consent** on the Entra app registration:

- `User.Read`, `offline_access` (silently injected)
- Mail: `Mail.Read`, `Mail.ReadWrite`, `Mail.Send` (send is gated by a same-domain guard — see [Same-domain Mail.Send](#same-domain-mailsend)), `MailboxSettings.Read`, `MailboxSettings.ReadWrite` (category master list only — no tool touches other mailbox settings)
- Calendar: `Calendars.Read`, `Calendars.Read.Shared` (`calendar-meeting-times-find`), `Calendars.ReadWrite`
- Files: `Files.Read`, `Files.ReadWrite.All` (the `drive-*` write tools; limits below)
- Directory: **`User.ReadBasic.All`**, `People.Read`
- Contacts: `Contacts.Read`
- SharePoint: **`Sites.Read.All`** (also covers `sharepoint-search`)
- Teams chats: `Chat.ReadBasic`, `Chat.Read`, `Chat.Create`, `ChatMessage.Send`
- Teams channels: **`Team.ReadBasic.All`**, **`Channel.ReadBasic.All`**, **`ChannelMessage.Read.All`**, **`ChannelMessage.Send`**
- Online meetings: `OnlineMeetings.Read`, `OnlineMeetings.ReadWrite`, **`OnlineMeetingTranscript.Read.All`**

Bold vs. not-bold reflects each scope's **default** `AdminConsentRequired` value in the [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference) (`Contacts.Read` delegated defaults to `No`, same as `Mail.Read`/`Calendars.Read`/`Files.Read`). That default is not a guarantee for every tenant: a tenant's user-consent policy (e.g. "Users can't consent to apps for the organization" or a Conditional Access policy) can still force admin consent for ANY scope regardless of this list. If first sign-in fails with `AADSTS65001`, grant admin consent explicitly for the app registration even for a not-bold scope.

After granting consent, users will see a single consent prompt on first sign-in covering everything they're authorized to use.

**Redirect URI — register exactly one.** The server brokers OAuth: Microsoft only ever redirects back to the server's own callback, never to the MCP client. Add this single redirect URI to the Entra app (Authentication → Web), using your public host:

```
https://<your-host>/auth/callback     # prod, e.g. https://m365.mcp.areteintelligence.ai/auth/callback
http://localhost:3000/auth/callback    # local dev
```

That one entry covers every MCP client. No per-client Entra changes are ever needed — clients obtain their own `client_id` through Dynamic Client Registration (see [Connecting a client](#connecting-a-client)).

## Connecting a client

Point any MCP client (Claude, MCP Inspector/Jam, Cursor, …) at `https://<your-host>/mcp` — that's it. The server is a self-contained OAuth authorization server, so the client auto-negotiates everything:

1. **Discovery** — `/.well-known/oauth-protected-resource` + `/.well-known/oauth-authorization-server`.
2. **Dynamic Client Registration** (RFC 7591) — the client POSTs its callback to `/register` and gets a `client_id`. No pre-registered credentials, no manual allowlisting.
3. **Authorize + token** — standard Authorization Code + PKCE against `/authorize` and `/token`.
4. The client then sends `Authorization: Bearer <session>` on `/mcp`.

Clients that don't perform DCR (Claude.ai today) keep working via the legacy `MS365_MCP_ALLOWED_REDIRECT_URIS` fallback.

### Same-domain Mail.Send

The server can draft, update, attach to, delete, and **send** mail. Send is exposed through two tools, both scope `Mail.Send` and both wrapped in the same same-domain guard enforced **in code** before anything reaches Graph:

- `mail-draft-send` (`POST /me/messages/{id}/send`) — send an existing draft after review. Refused unless the message is a draft (`isDraft=true`) **and** the sender and **every** recipient (to/cc/bcc) are in the same email domain.
- `mail-send` (`POST /me/sendMail`) — send a message in one step, no draft. Refused unless the message has recipients **and** the sender and **every** recipient (to/cc/bcc) are in the same email domain. This skips human-in-Outlook review, so it pairs well with an out-of-band confirmation step (a `request_human_input` tool or an MCP elicitation request) before the model calls it.

Two independent controls gate both. The per-user **policy** decides _who_ may call `mail-draft-send` / `mail-send` at all (they are off `defaults.allow` like every other write tool, so a UPN must be granted them explicitly). The **`mailSend` policy block** then decides _which_ domains may send to themselves:

```yaml
mailSend:
  requireSameDomain: true # master switch; default true even if this block is omitted
  allowedDomains: # the shared domain must be one of these; empty => the sender's own domain
    - aretepartners.com
```

So with the example policy, `me@aretepartners.com` can send to other `@aretepartners.com` recipients, but a message addressed to any external recipient — or a sender outside `aretepartners.com` — is rejected. Admins tune this live via the admin UI (`/admin/policy`) or on disk + SIGHUP; the same-domain summary is shown on the dashboard. Set `requireSameDomain: false` to lift the domain restriction entirely (the per-user allow/deny gate still applies).

The guard is a `Tool.precondition` (see [Server-enforced invariants](#server-enforced-invariants)) — it is enforced in the runtime, not by the tool description, so the model cannot talk its way past it. Cross-domain or external mail still goes through a human in Outlook. This closes out the approved-domain allow-list contemplated in [issue #9](https://github.com/aretecp/ms-365-mcp-server/issues/9).

### Contacts: privacy and pagination

`contact-list` returns a compact field set by default — including `categories` (a business-classification tag) but omitting `personalNotes` (a private free-text annotation). This is a default **projection**, not an authorization boundary: `personalNotes` is also returned by `contact-list` itself given an explicit `$select=personalNotes` or `response_format: 'detailed'`, as well as by `contact-get` — all three still require a tool call the caller's policy must allow. Contact folders can nest arbitrarily; `contact-folder-list` walks the tree one level at a time (`parent-folder-id`), and any folder id it returns works directly with `contact-list`/`contact-get` regardless of depth. Every contact/folder id Graph path parameter is validated as a single opaque path segment (non-empty, not `.`/`..`, no `/`/`\`) before use — a dot-segment or separator could otherwise collapse the resolved Graph path (via standard URL normalization) into a different endpoint than the tool declares.

`contact-list`/`contact-folder-list` do not use the generic narrow-only truncation envelope the rest of the tool surface uses (see [Server-enforced invariants](#server-enforced-invariants) / `docs/solutions/architecture-patterns/mcp-tool-surface-design.md` for why that design is deliberate elsewhere). An address book can run to thousands of contacts, and [Microsoft Graph's paging contract](https://learn.microsoft.com/en-us/graph/paging) permits empty result pages and requires following its `@odata.nextLink` verbatim rather than reconstructing continuation — so these two tools report `{ value, returnedCount, hasMore, cursor? }` instead: pass `cursor` back verbatim to continue, stop once `hasMore` is false. `cursor` is an opaque, HMAC-signed token minted by this server (using `MS365_MCP_SESSION_KEY`) and bound to the exact tool, the exact resolved collection path (so a same-host `@odata.nextLink` for a different Graph resource is refused, not followed), and the caller that requested it — the server refuses a cursor that doesn't match on redemption, so one user's cursor can't be replayed by another, and a cursor from one folder/filter can't be redirected at another. It carries only a Graph path+query (never a bearer token or row data) taken from Graph's own validated `@odata.nextLink`, so the raw nextLink URL itself is never exposed to the caller. A response-size-ceiling truncation advances the cursor by exactly how many rows this response actually returned, replaying the same already-fetched Graph page to recover the rest. This is best-effort continuation, not a frozen snapshot: Graph has no consistency token for contacts, so if the mailbox changes while paginating (a contact added, deleted, or reordered), a row could occasionally be skipped or duplicated near the edit — the same limitation any offset-based Graph paging has. `fetchAllPages` is refused on both tools (and not advertised in their schema) so the old all-pages merge can never undermine this contract. The response-size ceiling is enforced against the actual serialized envelope in whichever [output format](#output-formats) is configured (JSON or TOON) — both are fully supported, matching this repo's deployed `MS365_MCP_OUTPUT_FORMAT=toon` default.

### Response shaping

No tool hands the agent Graph's raw object. Every response is condensed to what the agent needs for its next step: an `id` on every item (plus `conversationId`, `chatId`, `driveId`, `contentPath`, … where a follow-up tool takes them), the item's main summary (subject, people as `Name <address>`, times, plain-text Teams bodies), and links for the human (`webLink`/`webUrl`). Graph bookkeeping (`@odata.*`, `changeKey`, hashes, empty fields) is dropped.

- **Lists** project fields server-side (`$select`, `src/tools/projections.ts`) and/or shape each item (`Tool.shape` with `listShape`, `src/tools/shapes.ts`), keeping `@odata.nextLink` for paging. Teams message lists cap each body at 1,000 chars and mark `truncated`; the matching `-get` tool returns the full text.
- **Reads by id** return the full summary including the body (mail, events, Teams messages) or every populated property (`contact-get`).
- **Writes** return the new/updated item's id and the fields needed to check or continue (draft recipients, event times and join link, sent-message link) — never the echoed payload (attachment bytes are never returned).
- **Opt out** per call with `select` (exact fields) or `response_format: "detailed"` (the full Graph object).

## Server-enforced invariants

> **Tool descriptions are not a security control.** The LLM can ignore them; well-meaning prompt-engineering papers over real authorization gaps. This server enforces critical invariants in code, in the runtime, before any outbound Graph call. If the description says "draft" and the LLM passes a non-draft id, the server refuses — independent of policy, independent of the model's intent.

Mechanism: `Tool.precondition` in `src/tools/types.ts`. Before executing a tool, the runtime in `src/tool-runtime.ts` invokes the precondition; a thrown error becomes a structured MCP error response and the main Graph call never fires.

Current preconditions:

| Tool                    | Invariant                                                                   | Implementation                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `mail-message-update`   | message must satisfy `isDraft=true`                                         | `assertIsDraft` — GET `/me/messages/{id}?$select=isDraft`, refuse if not a draft                                               |
| `mail-attachment-add`   | message must satisfy `isDraft=true`                                         | same                                                                                                                           |
| `mail-message-delete`   | message must satisfy `isDraft=true`                                         | same — model cannot mass-delete received mail                                                                                  |
| `mail-draft-send`       | draft + sender and all recipients in the same (allowed) domain              | `assertSendWithinDomain` — GET recipients, refuse cross-domain/external per the `mailSend` policy                              |
| `mail-send`             | recipients present + sender and all recipients in the same (allowed) domain | `assertDirectSendWithinDomain` — read recipients from the request body, refuse cross-domain/external per the `mailSend` policy |
| `calendar-event-update` | event must satisfy `isOrganizer=true`                                       | `assertIsOrganizer` — GET `/me/events/{id}?$select=isOrganizer`, refuse if not organizer                                       |
| `calendar-event-delete` | event must satisfy `isOrganizer=true`                                       | same                                                                                                                           |

Tools with a server-built request body (`Tool.execute`): the model supplies validated parameters, never the Graph payload.

| Tool                                       | Invariant                                                               | Implementation                                                                                                                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mail-message-categories-modify`           | only `categories` changes, on any message                               | reads current categories, PATCHes `{ categories }` built from add/remove names                                                                                                                 |
| `mail-thread-categories-modify`            | only `categories` changes; ≤100 messages; no partial start on bad input | reads the whole thread (trusted `nextLink` only) before any PATCH; refuses oversized threads; reports per-message failures                                                                     |
| `teams-chat-create`                        | caller included; colleagues only (no guests, no external users)         | GETs each member first, refuses `userType=Guest`, `#EXT#` UPNs, or unreadable profiles; binds GUIDs as `owner`, no `tenantId`                                                                  |
| `drive-file-upload`, `drive-folder-create` | never overwrite                                                         | upload GETs `parent:/name:` and refuses unless it 404s; both send `@microsoft.graph.conflictBehavior=fail`; names validated; upload ≤ 4 MB                                                     |
| `drive-file-update`                        | no silent clobber of a concurrent edit                                  | refuses `*`/unquoted eTags; GETs the item and refuses unless its current eTag equals the agent's; also sends `If-Match`; files only                                                            |
| `drive-item-move`, `drive-item-copy`       | these tools cannot cross drives (library or OneDrive)                   | GETs source and destination; refuses unless both share a `driveId`, the destination is a folder, and neither is a shortcut (`remoteItem`) or the source root; sends the checked destination id |
| `drive-file-delete`                        | one file at a time; never a tree                                        | GETs the item; refuses folders, notebooks (`package`), shortcuts, and the root; deletes go to the recycle bin                                                                                  |

The same-drive rule bounds move/copy only: an agent allowed `download-bytes` and `drive-file-upload` can still re-upload content it can read into any drive it can write. Guard refusals inside `Tool.execute` throw `ToolRefusal` and are logged as `precondition_failed`.

`download-bytes` accepts only binary endpoints: a relative path ending in `/content` or `/$value`, with no `.`/`..` segments. Otherwise it would be a free-form GET reaching any JSON resource the token's scopes allow (mailbox settings, inbox rules), outside per-tool policy.

`Mail.ReadWrite` at the Graph layer is broader than what we want to expose. Without `assertIsDraft`, the LLM could PATCH any message (mark as read, flag, move), DELETE any message (clear an inbox), or attach files to received mail. The precondition closes that gap. The single deliberate exception is categorization: the two `*-categories-modify` tools can tag received and sent mail, but their handlers build a `{ categories }`-only body, so nothing else on the message is reachable.

`Calendars.ReadWrite` has the same shape: it covers any event the signed-in user is an attendee of, not just events they organize. Without `assertIsOrganizer`, the LLM could PATCH an attendee-side event (silently mutating the user's local copy) or DELETE one (which Graph interprets as declining the invite). The precondition restricts both write paths to organizer-owned events; accepted/declined invites must be managed by the human in Outlook.

The full surface audit ran in [issue #11](https://github.com/aretecp/ms-365-mcp-server/issues/11) and lives in [`docs/SECURITY-AUDIT.md`](docs/SECURITY-AUDIT.md). Remaining preconditions identified by the audit are tracked in [issue #12](https://github.com/aretecp/ms-365-mcp-server/issues/12) (`assertChatIsPostable` for `teams-chat-message-send`) and [issue #13](https://github.com/aretecp/ms-365-mcp-server/issues/13) (`assertChannelIsStandardAndInternal` for `teams-channel-message-send` + `teams-channel-message-reply-send`). Online-meeting writes and event/draft creation tools are closed by Graph natural scoping — no precondition needed.

## Production deployment

Deploy, secrets and operations: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). The server expects:

- `MS365_MCP_CLIENT_ID`, `MS365_MCP_TENANT_ID`, `MS365_MCP_CLIENT_SECRET` (latter required for confidential-client setups).
- `MS365_MCP_PUBLIC_URL` (or `--public-url`) when running behind a reverse proxy. Browser-facing OAuth redirects (including the server's `/auth/callback`) use this; internal endpoints stay on the request origin.
- `MS365_MCP_ALLOWED_REDIRECT_URIS` — legacy redirect allowlist for clients that do **not** perform Dynamic Client Registration (e.g. Claude.ai). DCR clients are validated against their own registered `redirect_uris`, so new clients need no entry here. Optional.
- `MS365_MCP_CORS_ORIGIN` — optional. Leave unset for permissive CORS (reflects the caller's Origin) so any MCP client can connect; set to a single origin to pin it for a hardened deployment.

## CLI options

```
-v                 Verbose logging
--http [address]   Bind Streamable HTTP transport. Format: [host:]port (e.g. "3000", ":3000", "localhost:3000"). Default: all interfaces on port 3000.
--public-url <url> Public base URL (e.g. https://mcp.example.com) used in browser-facing OAuth redirects when behind a reverse proxy.
--toon             TOON output format. ~30-60% fewer tokens than JSON for uniform array data.
```

Environment variables:

- `MS365_MCP_CLIENT_ID`, `MS365_MCP_TENANT_ID`, `MS365_MCP_CLIENT_SECRET` — Entra app credentials.
- `MS365_MCP_PUBLIC_URL` — see above.
- `MS365_MCP_CORS_ORIGIN` — see above.
- `MS365_MCP_ALLOWED_REDIRECT_URIS` — see above.
- `MS365_MCP_OUTPUT_FORMAT=toon` — alternative to `--toon`.
- `MS365_MCP_MAX_TOP=<n>` — hard cap on Graph `$top` for list requests.
- `MS365_MCP_BODY_FORMAT=html` — return email bodies as HTML instead of plain text (default: text).
- `MS365_MCP_POLICY_PATH` — override the default `./policy/policy.yaml` location.
- `MS365_MCP_POLICY_ADMINS` — **required** comma-separated list of UPNs allowed to access the admin UI at `/admin/login`. Server refuses to start if empty.
- `LOG_LEVEL`, `SILENT`.

## Admin UI

Operators with a UPN listed in `MS365_MCP_POLICY_ADMINS` can manage `policy/policy.yaml` through a browser. Visit `https://<host>/admin/login`, complete the Microsoft sign-in, edit the YAML, save. The save is atomic and the live policy reloads in-process — no restart, signed-in MCP users keep their sessions.

For operators who prefer the CLI, edits to the file directly are picked up by sending **SIGHUP** to the server process:

```bash
kill -HUP $(pidof microsoft-mcp-server)
```

Failed reloads (bad YAML, validation error) are logged and the previously-loaded policy stays active — a typo never takes the server down.

## Output formats

JSON by default. Pass `--toon` (or `MS365_MCP_OUTPUT_FORMAT=toon`) for [Token-Oriented Object Notation](https://github.com/toon-format/toon) — 30-60% fewer tokens vs JSON, ideal for cost-sensitive batch workloads against uniform array data (lists of emails, events, files).

## Auth flow

OAuth Authorization Code + PKCE, **brokered**. The server is the OAuth client to Entra _and_ a self-contained OAuth authorization server to the MCP client. Microsoft only ever redirects to the server's own `/auth/callback`, so a single Entra redirect URI serves every client, and clients self-register via RFC 7591 DCR.

```
MCP client ──/register──> us  (gets client_id)
MCP client ──/authorize──> us ──MS authorize (our callback, server PKCE)──> Entra
Entra ──code──> us (/auth/callback) ──MS token exchange──> Entra ──tokens──> us
   us: create session, mint OUR auth code ──redirect to client callback──> MCP client
MCP client ──/token (our code + client PKCE verifier)──> us ──opaque session id──> MCP client
MCP client ──Bearer <session id>──> /mcp
```

Per-user sessions are SQLite-backed: the MCP client holds an opaque session id, while encrypted Microsoft refresh + access tokens stay server-side and are refreshed transparently on each call. PKCE is verified end-to-end — the brokered authorization code is useless without the client's verifier. Dynamically-registered clients live in the `oauth_clients` table (same DB file as sessions).

## Contributing

Internal Areté repository. Before opening a PR:

```bash
npm run verify
```

Runs lint, format check, build, and tests.

## License

MIT. See [LICENSE](./LICENSE).
