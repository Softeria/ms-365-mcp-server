import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import logger from './logger.js';
import {
  searchEndpoints,
  getEndpoint,
  searchSchemas,
  getSchema,
  getSchemaStats,
  type EndpointEntry,
  type SchemaEntry,
  type SchemaField,
} from './schema-index.js';

/**
 * Register schema introspection MCP tools.
 * These tools provide Graph API schema context to AI assistants building
 * M365 integrations — no authentication required, reads pre-built index only.
 */
export function registerSchemaTools(server: McpServer): void {
  const stats = getSchemaStats();

  server.tool(
    'search-graph-schema',
    `Search across ${stats.endpoints} Microsoft Graph API endpoints and ${stats.schemas} entity schemas. Use this to find endpoints by keyword before requesting detailed schema information.`,
    {
      query: z.string().describe('Search query (e.g., "user mailbox", "calendar event", "sharepoint list")'),
      category: z
        .string()
        .describe(
          'Filter by category: mail, calendar, files, contacts, tasks, teams, sharepoint, onenote, excel, search, users'
        )
        .optional(),
      type: z
        .enum(['endpoints', 'schemas', 'all'])
        .describe('What to search: endpoints (API operations), schemas (entity types), or all')
        .default('all')
        .optional(),
      limit: z.number().describe('Max results per type (default: 10)').default(10).optional(),
    },
    {
      title: 'search-graph-schema',
      readOnlyHint: true,
      openWorldHint: false,
    },
    async ({ query, category, type = 'all', limit = 10 }) => {
      const result: Record<string, unknown> = {};

      if (type === 'endpoints' || type === 'all') {
        const endpoints = searchEndpoints(query, category, limit);
        result.endpoints = {
          found: endpoints.length,
          results: endpoints,
        };
      }

      if (type === 'schemas' || type === 'all') {
        const schemas = searchSchemas(query, limit);
        result.schemas = {
          found: schemas.length,
          results: schemas,
        };
      }

      result.tip =
        'Use describe-graph-endpoint with a toolName for full endpoint details, or describe-graph-schema with a schema name for entity field definitions.';

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'describe-graph-endpoint',
    'Get detailed schema information for a specific Microsoft Graph API endpoint. Use search-graph-schema first to find the toolName.',
    {
      toolName: z
        .string()
        .describe('The tool name (e.g., "list-mail-messages", "get-calendar-event")'),
      section: z
        .enum(['all', 'parameters', 'request', 'response', 'permissions', 'odata'])
        .describe(
          'Which section to return. Use specific sections to reduce response size. Default: all'
        )
        .default('all')
        .optional(),
    },
    {
      title: 'describe-graph-endpoint',
      readOnlyHint: true,
      openWorldHint: false,
    },
    async ({ toolName, section = 'all' }) => {
      const endpoint = getEndpoint(toolName);
      if (!endpoint) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Endpoint not found: ${toolName}`,
                tip: 'Use search-graph-schema to find available endpoints.',
              }),
            },
          ],
          isError: true,
        };
      }

      const result = formatEndpointSection(endpoint, toolName, section);

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'describe-graph-schema',
    'Get field definitions for a Microsoft Graph entity type. Use search-graph-schema first to find schema names.',
    {
      schemaName: z
        .string()
        .describe(
          'Schema name (e.g., "microsoft.graph.message" or shorthand "message")'
        ),
      depth: z
        .number()
        .describe(
          'How deep to resolve $ref fields: 1 = top-level fields only, 2 = expand one level of nested refs. Default: 1'
        )
        .default(1)
        .optional(),
      fields: z
        .string()
        .describe(
          'Comma-separated field names to include (e.g., "id,subject,from"). Omit for all fields.'
        )
        .optional(),
    },
    {
      title: 'describe-graph-schema',
      readOnlyHint: true,
      openWorldHint: false,
    },
    async ({ schemaName, depth = 1, fields }) => {
      const schema = getSchema(schemaName);
      if (!schema) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Schema not found: ${schemaName}`,
                tip: 'Use search-graph-schema to find available schemas. Try the short name without "microsoft.graph." prefix.',
              }),
            },
          ],
          isError: true,
        };
      }

      const result = formatSchema(schemaName, schema, depth, fields);

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  logger.info(
    `Schema introspection tools registered (${stats.endpoints} endpoints, ${stats.schemas} schemas)`
  );
}

function formatEndpointSection(
  endpoint: EndpointEntry,
  toolName: string,
  section: string
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    toolName,
    method: endpoint.method,
    path: endpoint.path,
    description: endpoint.description,
  };

  if (endpoint.docsUrl) {
    base.docsUrl = endpoint.docsUrl;
  }

  if (endpoint.llmTip) {
    base.tip = endpoint.llmTip;
  }

  if (section === 'all' || section === 'parameters') {
    base.parameters = endpoint.parameters;
  }

  if (section === 'all' || section === 'odata') {
    const supportedOdata = Object.keys(endpoint.odata).filter((k) => endpoint.odata[k]);
    base.odata = {
      supported: supportedOdata.map((k) => `$${k}`),
    };
  }

  if (section === 'all' || section === 'request') {
    if (endpoint.requestBodySchema) {
      const bodySchema = getSchema(endpoint.requestBodySchema);
      base.requestBody = {
        schema: endpoint.requestBodySchema,
        fields: bodySchema
          ? bodySchema.fields.map(formatFieldCompact)
          : null,
      };
    } else {
      base.requestBody = null;
    }
  }

  if (section === 'all' || section === 'response') {
    base.response = {
      type: endpoint.responseType,
      schema: endpoint.responseSchema,
    };
    if (endpoint.responseSchema) {
      const respSchema = getSchema(endpoint.responseSchema);
      if (respSchema) {
        base.response = {
          ...base.response as Record<string, unknown>,
          fields: respSchema.fields.map(formatFieldCompact),
        };
      }
    }
  }

  if (section === 'all' || section === 'permissions') {
    base.permissions = {
      scopes: endpoint.scopes,
      workScopes: endpoint.workScopes,
      orgModeRequired: endpoint.orgModeRequired,
    };
  }

  return base;
}

function formatSchema(
  schemaName: string,
  schema: SchemaEntry,
  depth: number,
  fieldsFilter?: string
): Record<string, unknown> {
  let fields = schema.fields;

  // Apply field filter
  if (fieldsFilter) {
    const allowed = new Set(fieldsFilter.split(',').map((f) => f.trim()));
    fields = fields.filter((f) => allowed.has(f.name));
  }

  const formattedFields = fields.map((field) => {
    const formatted = formatFieldCompact(field);

    // Resolve $ref at depth 2
    if (depth >= 2 && field.ref) {
      const refSchema = getSchema(field.ref);
      if (refSchema) {
        formatted.refFields = refSchema.fields.map(formatFieldCompact);
      }
    }

    return formatted;
  });

  return {
    schema: schemaName,
    description: schema.description,
    fieldCount: schema.fields.length,
    fields: formattedFields,
  };
}

function formatFieldCompact(
  field: SchemaField
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    name: field.name,
    type: field.type,
  };

  if (field.description) result.description = field.description;
  if (field.nullable) result.nullable = true;
  if (field.required) result.required = true;
  if (field.enum) result.enum = field.enum;
  if (field.ref) result.ref = field.ref;

  return result;
}
