import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SchemaField {
  name: string;
  type: string;
  description: string;
  nullable: boolean;
  required: boolean;
  enum?: string[];
  ref?: string;
}

export interface SchemaEntry {
  description: string;
  fields: SchemaField[];
}

export interface EndpointParameter {
  name: string;
  in: string;
  type: string;
  required: boolean;
  description: string;
}

export interface EndpointEntry {
  method: string;
  path: string;
  description: string;
  docsUrl: string | null;
  parameters: EndpointParameter[];
  odata: Record<string, boolean>;
  requestBodySchema: string | null;
  responseSchema: string | null;
  responseType: string;
  scopes: string[] | null;
  workScopes: string[] | null;
  orgModeRequired: boolean;
  llmTip: string | null;
}

export interface SchemaIndex {
  generatedAt: string;
  endpoints: Record<string, EndpointEntry>;
  schemas: Record<string, SchemaEntry>;
}

let cachedIndex: SchemaIndex | null = null;

export function loadSchemaIndex(): SchemaIndex {
  if (cachedIndex) return cachedIndex;

  const indexPath = path.join(__dirname, 'generated', 'schema-index.json');
  try {
    cachedIndex = JSON.parse(readFileSync(indexPath, 'utf8'));
    logger.info(
      `Schema index loaded: ${Object.keys(cachedIndex!.endpoints).length} endpoints, ${Object.keys(cachedIndex!.schemas).length} schemas`
    );
    return cachedIndex!;
  } catch (error) {
    throw new Error(
      `Failed to load schema index from ${indexPath}. Run 'npm run generate' to build it. ${(error as Error).message}`
    );
  }
}

export function searchEndpoints(
  query: string,
  category?: string,
  limit: number = 20
): Array<{ toolName: string } & Pick<EndpointEntry, 'method' | 'path' | 'description' | 'scopes' | 'orgModeRequired'>> {
  const index = loadSchemaIndex();
  const queryLower = query.toLowerCase();
  const results: Array<{ toolName: string } & Pick<EndpointEntry, 'method' | 'path' | 'description' | 'scopes' | 'orgModeRequired'>> = [];

  for (const [toolName, ep] of Object.entries(index.endpoints)) {
    // Category filter using same regex patterns as tool-categories.ts
    if (category) {
      const categoryPatterns: Record<string, RegExp> = {
        mail: /mail|attachment|draft/i,
        calendar: /calendar|event/i,
        files: /drive|file|upload|download|folder|item/i,
        contacts: /contact/i,
        tasks: /todo|planner|task/i,
        teams: /team|channel|chat/i,
        sharepoint: /sharepoint|site|list/i,
        onenote: /onenote|notebook|section|page/i,
        excel: /excel|worksheet|workbook|range|chart/i,
        search: /search|query/i,
        users: /user/i,
      };
      const pattern = categoryPatterns[category.toLowerCase()];
      if (pattern && !pattern.test(toolName)) continue;
    }

    const searchText = `${toolName} ${ep.path} ${ep.description} ${ep.llmTip || ''}`.toLowerCase();
    if (searchText.includes(queryLower)) {
      results.push({
        toolName,
        method: ep.method,
        path: ep.path,
        description: ep.description,
        scopes: ep.scopes,
        orgModeRequired: ep.orgModeRequired,
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}

export function getEndpoint(toolName: string): EndpointEntry | null {
  const index = loadSchemaIndex();
  return index.endpoints[toolName] || null;
}

export function searchSchemas(
  query: string,
  limit: number = 20
): Array<{ name: string; description: string; fieldCount: number }> {
  const index = loadSchemaIndex();
  const queryLower = query.toLowerCase();
  const results: Array<{ name: string; description: string; fieldCount: number }> = [];

  for (const [name, schema] of Object.entries(index.schemas)) {
    const shortName = name.replace('microsoft.graph.', '');
    const searchText = `${shortName} ${name} ${schema.description}`.toLowerCase();
    if (searchText.includes(queryLower)) {
      results.push({
        name,
        description: schema.description,
        fieldCount: schema.fields.length,
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}

export function getSchema(schemaName: string): SchemaEntry | null {
  const index = loadSchemaIndex();
  // Try exact match first, then with microsoft.graph. prefix
  return (
    index.schemas[schemaName] ||
    index.schemas[`microsoft.graph.${schemaName}`] ||
    null
  );
}

export function getSchemaStats(): { endpoints: number; schemas: number; generatedAt: string } {
  const index = loadSchemaIndex();
  return {
    endpoints: Object.keys(index.endpoints).length,
    schemas: Object.keys(index.schemas).length,
    generatedAt: index.generatedAt,
  };
}
