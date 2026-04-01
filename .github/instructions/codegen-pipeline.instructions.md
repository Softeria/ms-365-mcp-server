---
applyTo: bin/**/*.mjs,src/generated/**
---

# Code Generation Pipeline

## Overview

The pipeline in `bin/generate-graph-client.mjs` runs four steps:

1. **Download** — Fetches the full Microsoft Graph OpenAPI spec (~36MB YAML) to `openapi/openapi.yaml`
2. **Simplify** — Trims the spec to only endpoints listed in `src/endpoints.json`, resolves $refs, flattens allOf/anyOf, prunes unused schemas → `openapi/openapi-trimmed.yaml`
3. **Generate client** — Runs `openapi-zod-client` on the trimmed spec → `src/generated/client.ts` with Zod-typed endpoint definitions
4. **Generate schema index** — Parses the trimmed spec + endpoints.json into a pre-processed JSON for the schema introspection tools → `src/generated/schema-index.json`

## Critical Rules

- **NEVER edit files in `src/generated/`** — they are overwritten by `npm run generate`
- The `hack.ts` file provides a Zodios compatibility shim so `openapi-zod-client` output works without the full Zodios library
- After any change to `endpoints.json`, run `npm run generate` to regenerate everything

## simplified-openapi.mjs Key Behaviours

- Resolves `$ref` parameters inline
- Sets `operationId` to the `toolName` from endpoints.json
- Flattens `allOf`/`anyOf`/`oneOf` to reduce schema complexity
- Caps nested property depth at 3 levels
- Reduces schemas with >25 properties to the 25 most common fields
- Prunes unreferenced schemas, responses, and requestBodies
- Cleans broken `$ref` links after pruning

## generate-schema-index.mjs Key Behaviours

- Extracts endpoint metadata (params, OData support, scopes, response schemas)
- Extracts entity schemas with field definitions (type, nullable, enum, $ref)
- Skips ODataErrors schemas
- Resolves response types as `single` or `collection` (detecting the value[] pattern)
- Output is a compact JSON suitable for runtime search and lookup
