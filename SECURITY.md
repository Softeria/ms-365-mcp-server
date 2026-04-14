# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in `@ixtria/outlook-mcp-hardened`, please report it responsibly.

**Preferred channel — GitHub Private Vulnerability Reporting (PVR)**:
Go to the [Security Advisories page](../../security/advisories/new) and submit a new advisory.

**Alternative channel — Email**:
Send details to **security@ixtria.ch**. PGP key available on request.

Please **do not** open public issues for security vulnerabilities.

## Scope

This project is a security-hardened fork of [`ms-365-mcp-server`](https://github.com/softeria/ms-365-mcp-server) focused on Microsoft Outlook (Mail + Calendar) via MCP. The hardening layers we own and triage:

- **Egress allowlist** — network boundary enforcement
- **Audit trail** — request logging integrity
- **Anti-prompt-injection** — wrapping of untrusted mail content
- **Token storage** — local keychain / encrypted fallback
- **Scope minimisation** — read-first flags (`--enable-send`, `--enable-write`)

Vulnerabilities in upstream code that we inherited unchanged will be forwarded to Softeria when applicable, alongside our own patch.

## Response Time

We aim to acknowledge reports within **3 business days** and provide a remediation timeline within **10 business days**. Critical issues affecting data confidentiality or allowing token exfiltration will be prioritised.

## Out of Scope (see PLAN.md §11)

- Malicious MCP clients (trust model: operator runs the agent)
- Rate limiting (delegated to Microsoft Graph)
- Multi-tenant isolation (one instance = one operator)
