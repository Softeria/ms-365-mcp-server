# Phase 08 Connector Operations

Phase 08 keeps Streamable HTTP as the canonical hosted connector path and treats advanced MCP features as negotiated, tenant-scoped capabilities. Existing static-preset tenants are unchanged until an admin explicitly migrates or creates them with a Phase 08 discovery preset.

## Canonical transport

Use Streamable HTTP for hosted connectors:

```text
https://mcp.example.com/t/<tenant-route-id>/mcp
```

This path is the full Phase 08 surface for tools, discovery, resources, prompts/skills, completions, logging, notifications, structured results, Apps fallback links, and capability diagnostics.

Legacy SSE remains a compatibility/deprecation path only:

```text
GET  /t/<tenant-route-id>/sse
POST /t/<tenant-route-id>/messages
```

The SSE shim supports the legacy endpoint event and an initialize response, but it advertises only `tools` and returns:

```text
Legacy SSE has limited Phase 08 support. Use /t/{tenantId}/mcp for the full Streamable HTTP connector surface.
```

Do not configure new Claude.ai, Claude Desktop, Claude Code, or API clients against SSE. Use `/mcp` instead.

## Claude client support matrix

Use this matrix when deciding which tenant policy switches to enable. Do not assume an advanced primitive is available unless the active client advertises it during MCP initialize.

| Client                             | Supported surfaces from current evidence                                    | Notes                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code                        | Resources, Prompts, Tools, Discovery, Instructions, Roots, Elicitation, DCR | Best fit for local workflows and roots-based import/export when the client advertises roots.                                                   |
| Claude Desktop                     | Resources, Prompts, Tools, Roots, DCR, Apps                                 | Apps can render in capable builds; keep text and structured fallbacks.                                                                         |
| Claude.ai                          | Resources, Prompts, Tools, CIMD, DCR, Apps                                  | Do not claim Claude.ai roots or elicitation support without new evidence. Hosted connectors should use Streamable HTTP and graceful fallbacks. |
| Claude API / tool-only MCP clients | Tools via discovery loop                                                    | Use `search-tools` -> `get-tool-schema` -> `execute-tool`; results include text and structured JSON where supported.                           |

## Admin enablement flow

1. Confirm the tenant is intended to receive Phase 08 behavior. Static-preset tenants remain static until changed.
2. Patch or create the tenant with a discovery preset such as `discovery-v1` and an explicit allowed scope list.
3. Enable optional policy features only after client support is known:
   - Apps enabled/disabled.
   - Sampling policy enabled/disabled.
   - Elicitation policy enabled/disabled.
   - Roots import/export allowed only for local clients that advertise roots.
4. Seed built-in skill packs for the tenant where desired.
5. Fork static or bundled prompts into DB-backed tenant skills only when the operator wants editable copies. Built-ins remain read-only and future built-in updates do not mutate tenant edits.
6. Run local smoke before exposing the connector to users.

Example tenant patch shape:

```http
PATCH /admin/tenants/<tenant-route-id>
Authorization: Bearer <admin-token-or-api-key>
Content-Type: application/json

{
  "preset_version": "discovery-v1",
  "enabled_tools": null,
  "allowed_scopes": ["openid", "offline_access", "profile", "email", "User.Read", "Mail.ReadWrite", "Files.ReadWrite"],
  "phase8_policy": {
    "apps": true,
    "sampling": false,
    "elicitation": false,
    "roots": false
  }
}
```

If a deployment does not yet expose policy columns for every Phase 08 switch, keep those choices in the operator runbook and apply them through the first supported admin endpoint. Do not silently turn on Apps, sampling, elicitation, or roots for existing static tenants.

## Connector metadata and doctor

Required public metadata surfaces for tenant connectors:

```text
https://mcp.example.com/.well-known/oauth-authorization-server/t/<tenant-route-id>
https://mcp.example.com/.well-known/oauth-protected-resource/t/<tenant-route-id>
https://mcp.example.com/t/<tenant-route-id>/.well-known/oauth-authorization-server
https://mcp.example.com/t/<tenant-route-id>/.well-known/oauth-protected-resource
https://mcp.example.com/t/<tenant-route-id>/.well-known/mcp-connector
```

Run connector doctor locally or against a deployed endpoint:

```bash
ms-365-mcp-server \
  --connector-doctor https://mcp.example.com \
  --tenant-id <tenant-route-id> \
  --tenant-display-name Aspire \
  --observed-name "Microsoft 365 MCP Gateway - Aspire"
```

The doctor checks server-controlled OAuth protected-resource metadata and `.well-known/mcp-connector`. It passes when metadata names match the expected tenant display name. It fails when server-owned metadata diverges, and warns when the server metadata is correct but the hosted connector UI shows a different external label.

If Claude Work/Cowork shows `ToolHub` or another unexpected name:

1. Run connector doctor with the observed name.
2. Confirm `serverInfo.name`, protected-resource metadata, authorization-server metadata, and `.well-known/mcp-connector` all advertise the expected display name.
3. If server metadata is correct, recreate or update the external connector configuration in the hosted client; the stale name is outside the server-owned metadata surface.
4. If server metadata is wrong, fix `MS365_MCP_CONNECTOR_*` or tenant display-name configuration before onboarding users.

## Verification commands

Hermetic CI smoke:

```bash
npx vitest run test/transports/phase-08-transport-smoke.test.ts test/connector-smoke.test.ts
npm run build
```

Local inspector smoke:

```bash
npm run inspector -- --url https://mcp.example.com/t/<tenant-route-id>/mcp --transport streamable-http
```

Full phase gate when resources allow:

```bash
npm run verify
```

If full verification is killed by host memory limits, record the exact command, exit status, and last failing batch. Treat it as resource-inconclusive unless an assertion failure is present.

## Manual hosted checks

Record evidence for these items when a hosted Claude.ai/Cowork environment is available:

- Connector display name visible in the hosted UI.
- OAuth flow reaches the tenant authorization server and token endpoint.
- Apps render only in clients that support Apps; unsupported clients receive text, structured JSON, and resource links.
- Sampling and elicitation fall back deterministically when unsupported.
- Tool-only API clients complete `search-tools` -> `get-tool-schema` -> `execute-tool` without relying on prompts, resources, or Apps.
