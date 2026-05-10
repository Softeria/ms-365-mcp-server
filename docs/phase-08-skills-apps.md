# Phase 08 Skills and Apps

Phase 08 exposes skills and Apps through MCP primitives, not through a separate proprietary protocol. Skills are MCP prompts plus resources and tools. Apps are optional `ui://` resources over the same data returned as text and structured JSON.

## Skills model

- Built-in skills are bundled prompts and remain read-only.
- Tenant skills are DB-backed editable copies or custom prompts scoped to one tenant.
- User skills are personal copies when caller identity is known.
- Forked skills pin their source name and source version; built-in updates must not overwrite tenant or user edits.
- `validate-skill` and `save-skill` must reject references to disabled tools, inaccessible resources, or tenant/user memory that the caller cannot read, unless the skill is saved as a draft.

Typical authoring flow:

1. `list-skills` to inspect built-ins and tenant/user skills.
2. `get-skill` to fetch a source skill.
3. `fork-builtin-skill` or `save-skill` to create an editable tenant/user copy.
4. `validate-skill` to confirm frontmatter, arguments, tools, resources, recipes, bookmarks, facts, and risk metadata.
5. `render-skill` to preview prompt output.
6. `save-skill` to publish when validation passes.
7. `export-skill-pack` to snapshot skills and referenced memory for migration.

Static-preset tenants do not get editable skill behavior unless explicitly Phase 08-enabled. Hosted Claude/API clients that only support tools can still use the discovery loop and receive text/structured outputs.

## Skill pack migration

Skill packs can seed:

- Markdown prompt skills.
- Recipe references.
- Bookmark references.
- Fact recall hints.
- Optional resource documents.

Import paths:

- Tool argument or admin API body for all clients.
- MCP resource upload/export fallback for hosted clients.
- Roots-based file import/export only when a local client such as Claude Code or Claude Desktop advertises roots and the tenant policy allows roots.

Roots import/export must validate selected paths, extensions, sizes, and secret-file exclusions. Never require roots for a core workflow.

## Apps security model

Apps are optional views. Each App tool must return usable fallback content before or alongside any `ui://` link:

- Human-readable `content` text.
- `structuredContent` JSON for capable clients.
- `m365://` resource links for durable follow-up data.
- Optional `ui://m365/*.html` app metadata for clients that render Apps.

App assets must be sandbox-safe:

- No tokens, refresh tokens, app secrets, or raw credentials in app payloads.
- Strict CSP and sandbox headers.
- Same-tenant/session resource payloads only.
- Bounded payload size.
- Sanitized rendering for user-provided Microsoft 365 content.
- No arbitrary external script URLs.

Apps must not create app-only workflows. If Apps are unsupported, the same operation must remain useful through text, structured JSON, and resources.

## Client behavior by capability

| Capability      | Claude Code                              | Claude Desktop                      | Claude.ai                               | Tool-only API clients                                                     |
| --------------- | ---------------------------------------- | ----------------------------------- | --------------------------------------- | ------------------------------------------------------------------------- |
| Tools/discovery | Supported                                | Supported                           | Supported                               | Supported through `search-tools` -> `get-tool-schema` -> `execute-tool`   |
| Resources       | Supported                                | Supported                           | Supported                               | Use tool-returned resource links if the client can dereference them       |
| Prompts/skills  | Supported                                | Supported                           | Supported                               | Use skill tools instead of prompt UI                                      |
| Apps            | Not the primary local path               | Supported where client renders Apps | Supported where hosted Apps are enabled | Not required; fall back to text/JSON/resources                            |
| Roots           | Supported when advertised                | Supported when advertised           | Do not assume support                   | Not supported                                                             |
| Elicitation     | Supported by Claude Code when advertised | Do not assume unless advertised     | Do not claim support without evidence   | Use structured `elicitation_required` or `confirmation_required` fallback |
| Sampling        | Optional and policy-gated                | Optional and policy-gated           | Optional and policy-gated               | Deterministic fallback required                                           |

Use the active MCP initialize capabilities and tenant policy as the source of truth. A workflow must not fail solely because Apps, roots, sampling, or elicitation are missing.

## Notifications and structured output

Discovery tenants can emit tenant/session-filtered notifications such as:

- `notifications/tools/list_changed`
- `notifications/prompts/list_changed`
- `notifications/resources/list_changed`
- `notifications/resources/updated`
- logging notifications where supported

Notifications are best-effort and client-dependent. Results must still include text and structured JSON so clients without notifications can poll or rerun tools.

Structured output contract:

- Keep `content` as the portable text surface.
- Add `structuredContent` for typed results.
- Add `_meta` for capability diagnostics, resource links, app hints, and non-PII operational context.
- Do not place secrets or PII-heavy raw Graph payloads in logs or metadata.

## Admin checklist

Before enabling Apps/skills for a tenant:

1. Confirm the tenant is on `discovery-v1` or another Phase 08-enabled preset.
2. Confirm enabled tools and allowed scopes cover each skill's references.
3. Seed only the built-in packs needed by that tenant.
4. Decide whether Apps are enabled; if disabled, verify fallback text/JSON still works.
5. Decide sampling and elicitation policy; default to deterministic fallbacks for hosted clients until support is proven.
6. For local clients, enable roots only when the client advertises roots and operator policy allows file import/export.
7. Run connector and transport smoke tests before rollout.
