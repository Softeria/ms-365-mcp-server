# Security

## Threat model

This MCP runs locally on each Enabi employee's machine and acts as their Microsoft 365 user. Two threats matter most.

**Capability creep through upstream sync.** Upstream is an active project with a habit of adding new tools and scopes every few weeks. If we mergence an upstream change without reading it, we can silently expand what an LLM can do with employee accounts. The capability baseline, runtime allowlist, and weekly review process exist to catch this. See `docs/UPSTREAM_SYNC.md`.

**Token compromise on a developer machine.** The MCP stores OAuth refresh tokens. If a laptop is lost or compromised, those tokens grant the listed scopes until revoked. We rely on three things: tokens stored in the OS keychain (or `0600`-permission files on Linux), short-lived access tokens (about an hour) that require the refresh token to renew, and the Azure tenant's ability to revoke the entire app or one user's consent at any time. There is no central log of tool calls in this version. Audit logging to a shipped sink is on the roadmap.

## What we do NOT defend against

- A malicious employee acting as themselves through this MCP. They could already do the same things in Outlook directly.
- A malicious LLM input crafted to make Claude perform tool calls the user did not ask for (prompt injection). Claude is the trust boundary here, not the MCP. We mitigate the blast radius by keeping scopes tight and surfacing risky operations (like `send-mail`) for human confirmation in the agent prompt (`docs/USAGE.md`).
- Microsoft Graph itself being compromised. Out of scope.

## Reporting an issue

If you find a security issue in this fork, do **not** open a public GitHub issue. Instead:

- Slack Daniel directly, or
- Email `daniel@enabi.io` with `[SECURITY]` in the subject.

If the issue is in upstream and not in our fork, also report it to https://github.com/softeria/ms-365-mcp-server/security.

## Responsibilities

| Who | What |
|-----|------|
| Each employee | Keep their laptop locked, do not commit secrets, run `--logout` when leaving the machine for an extended period. |
| Daniel (current owner) | Approve every upstream-sync PR. Rotate the Azure app's client secret if leaked. Maintain the capability baseline. |
| IT (Azure tenant admins) | Pre-consent the scopes in `docs/SCOPES.md` at the tenant level. Revoke a user's app consent if they leave Enabi or their account is compromised. |
