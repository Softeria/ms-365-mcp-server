# MS 365 OpenAPI Client Generation

This directory contains the generated TypeScript client for the Microsoft 365 API based on the OpenAPI specification.

> **Important Note for NPM Package Users**: 
> The source file `client.ts` (approximately 1MB) is excluded from the npm package to reduce package size, 
> but the compiled JavaScript file `client.js` is included. This means the package is fully functional,
> but you won't see the TypeScript source in the node_modules directory.

## The Evolution

### Initial Challenge

Our initial approach used the full MS 365 OpenAPI specification file directly. This created several significant problems:

- The spec file was a whopping 45MB in size
- It had to be included in the npm package
- Startup time was painfully slow due to parsing the large spec file

### Exploration Phase

We explored several alternatives:

1. Live-parsing a trimmed version of the spec file
2. Creating a static trimmed version
3. Pre-generating client code

### Current Solution

We eventually settled on a combined approach:

- Trim the OpenAPI spec to only what we need
- Generate static TypeScript client code using [openapi-zod-client](https://github.com/astahmer/openapi-zod-client)

### Benefits

- **Dramatically faster startup time** - No need to parse a large spec file
- **Significantly smaller package size** - No more bundling a 45MB spec file
- **Type safety** - Full TypeScript types generated from the OpenAPI spec
- **Validation** - Zod schemas for request/response validation

## Regenerating the Client

To regenerate the client code (e.g., after API changes or to update the supported endpoints):

```
npm run bin/generate-graph-client.mjs
```

This command does the following:

1. Fetches/processes the OpenAPI spec
2. Generates the TypeScript client with Zod validation
3. Outputs the result to `client.ts` in this directory

No complex build scripts needed - the generation is handled by openapi-zod-client.
