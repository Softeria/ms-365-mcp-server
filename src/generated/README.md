# MS 365 OpenAPI Client Generation

This directory contains the generated TypeScript client for the Microsoft 365 API based on the OpenAPI specification.

## The Evolution

### Version 1: AI-Generated Mappings

Our initial approach used AI to map Microsoft 365 documentation and OpenAPI specifications directly into MCP tools with
Zod mappings. While conceptually appealing, this approach didn't work well in practice and created several problems.

### Version 2: Direct OpenAPI Spec Usage

We then moved to using the full MS 365 OpenAPI specification file directly. This improved reliability but created new
significant problems:

- The spec file was a whopping 45MB in size
- It had to be included in the npm package
- Startup time was painfully slow due to parsing the large spec file

### Version 3: Current Solution (Trimmed Spec + Generated Client)

We eventually settled on a combined approach:

- Trim the OpenAPI spec to only what we need
- Generate static TypeScript client code using [openapi-zod-client](https://github.com/astahmer/openapi-zod-client)

### Benefits

- **Dramatically faster startup time** - No need to parse a large spec file
- **Significantly smaller package size** - No more bundling a 45MB spec file
- **Type safety** - Full TypeScript types generated from the OpenAPI spec
- **Validation** - Zod schemas for request/response validation

### Current Limitations & Future Improvements

While this approach is a significant improvement, it's not perfect. The MCP server might still struggle to understand
the MS 365 endpoints correctly, and there's room for improvements in how the API is exposed and documented for AI
assistants. However, with the current foundation of generated TypeScript clients and proper type safety, these
improvements should now be much easier to implement and maintain.

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
