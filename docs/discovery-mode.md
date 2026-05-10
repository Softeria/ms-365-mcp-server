# Discovery Mode

Discovery mode is the default tool surface for new tenants created through supported gateway and admin paths. New tenants default to `discovery-v1`, which exposes 12 meta tools instead of the full generated Graph catalog.

Existing tenants stay pinned to their stored `preset_version`. They are not migrated automatically, and `essentials-v1` remains the static preset for tenants that should keep the legacy tool-only surface.

## Visible Tools

`discovery-v1` exposes exactly these 12 visible tools:

- `search-tools`
- `get-tool-schema`
- `execute-tool`
- `bookmark-tool`
- `list-bookmarks`
- `unbookmark-tool`
- `save-recipe`
- `list-recipes`
- `run-recipe`
- `record-fact`
- `recall-facts`
- `forget-fact`

The discovery catalog behind `search-tools` and `get-tool-schema` can describe generated Graph and product aliases that are not visible in `tools/list`. By default, `execute-tool` may run read-only generated aliases from that catalog. Write-capable aliases and synthetic helpers such as `graph-batch`, large upload, and subscription lifecycle tools require explicit tenant enablement.

## Opt In An Existing Tenant

Preview the change first:

```bash
node bin/migrate-tenant-to-discovery.mjs --tenant-id <uuid> --dry-run
```

Apply the opt-in:

```bash
node bin/migrate-tenant-to-discovery.mjs --tenant-id <uuid>
```

The migration updates only `tenants.preset_version` to `discovery-v1`. It does not mutate `enabled_tools`. After the database transaction succeeds, it publishes tenant/tool invalidation and `tools/list_changed` notifications.

## Roll Back

Rollback is an admin API patch:

```http
PATCH /admin/tenants/{id}
Content-Type: application/json

{
  "preset_version": "essentials-v1"
}
```

This returns the tenant to the static tool-only surface. It does not delete tenant memory rows; they become inaccessible through static `tools/list` until the tenant opts back into discovery mode.

## MCP Surface

Discovery tenants get the 12 visible tools, tenant resources, canned prompts, alias completions, MCP logging, and memory-backed bookmarks, recipes, and facts. Static tenants keep a tool-only surface: no `bookmark-tool`, no `resources/list`, no `prompts/list`, no `completion/complete`, and no `logging/setLevel`.

Resources include tenant navigation guides, endpoint schema resources, bookmark/recipe/fact summaries, and recent audit views scoped to the caller tenant. Prompts provide 10 canned Microsoft 365 workflows. Completions suggest tenant ids, account names, prompt arguments, and generated aliases from the discovery catalog.

## Pgvector Gate

`MS365_MCP_PGVECTOR_ENABLED` controls optional pgvector-backed fact embeddings during migration. Reference Compose deployments use a pgvector-capable Postgres 16 image, but the runtime gate stays opt-in:

```env
MS365_MCP_PGVECTOR_ENABLED=0
```

Set it to `1` only when the target database advertises the `vector` extension. Startup migrations then create the extension, `tenant_facts.embedding`, and the vector index. When disabled, text and BM25 recall remain available. Enabling pgvector is an operator choice and is not required for discovery-mode opt-in.
