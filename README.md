# @ixtria/outlook-mcp-hardened

> **Status: hardening in progress (v0.1.0).** A complete README with threat model, Azure setup guide, and MCP client config is tracked in `PLAN.md` step 13 and will land before the first tagged release.

Security-hardened fork of [`@softeria/ms-365-mcp-server`](https://github.com/softeria/ms-365-mcp-server) (MIT) that exposes **Microsoft Outlook (Mail + Calendar)** through the Model Context Protocol.

## Goals

- **Minimal surface** — Mail + Calendar only (~58 endpoints, down from 202)
- **Read-first** — `Mail.Send` and `Calendars.ReadWrite` gated behind `--enable-send` / `--enable-write`
- **Hardcoded egress allowlist** — only `login.microsoftonline.com` and `graph.microsoft.com` are reachable
- **Zero telemetry** — no Sentry, no analytics, no phone-home
- **Structured audit trail** — every Graph call logged as JSON to stderr
- **Anti-prompt-injection** — mail bodies wrapped in `<untrusted_content>` tags
- **Local-only tokens** — OS keychain via `keytar`, AES-256 encrypted file fallback

## License

Apache-2.0. This is a derivative work of `ms-365-mcp-server` (MIT, © 2025 Softeria). See `LICENSE` for full text and attribution.

## Not Affiliated

Not affiliated with Microsoft or Softeria. Published by Ixtria SA (Switzerland) under Apache-2.0 for SME use cases with nFADP-compatible posture.

## Security Reports

See `SECURITY.md`. Preferred channel: GitHub Private Vulnerability Reporting or `security@ixtria.ch`.
