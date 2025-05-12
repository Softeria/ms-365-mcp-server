import fs from 'fs';
import path from 'path';

export function generateMcpTools(jsonFile, outputDir) {
  try {
    console.log('Generating MCP tool mappings from OpenAPI spec...');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created directory: ${outputDir}`);
    }

    const schemasFilePath = path.join(outputDir, 'zod-schemas.ts');
    const toolsFilePath = path.join(outputDir, 'mcp-tools.ts');

    const openApiSpec = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

    const schemasCode = generateZodSchemasCode(openApiSpec);
    const toolsCode = generateMcpToolsCode(openApiSpec);

    fs.writeFileSync(schemasFilePath, schemasCode);
    console.log(`Generated Zod schemas at: ${schemasFilePath}`);

    fs.writeFileSync(toolsFilePath, toolsCode);
    console.log(`Generated MCP tool mappings at: ${toolsFilePath}`);

    return true;
  } catch (error) {
    throw new Error(`Error generating MCP tool mappings: ${error.message}`);
  }
}

/**
 * Generate TypeScript code with Zod schemas from OpenAPI spec
 */
function generateZodSchemasCode(openApiSpec) {
  let code = `import { z } from 'zod';\n\n`;

  code += '// Schema declarations\n';
  const schemas = openApiSpec.components?.schemas || {};
  Object.keys(schemas).forEach((schemaName) => {
    const normalizedName = normalizeSchemaName(schemaName);
    code += `export const ${normalizedName} = z.lazy(() => ${normalizedName}Schema);\n`;
  });

  code += '\n// Schema definitions\n';
  Object.entries(schemas).forEach(([schemaName, schema]) => {
    const normalizedName = normalizeSchemaName(schemaName);
    code += `export const ${normalizedName}Schema = ${generateZodSchemaForDefinition(schema, schemas)};\n\n`;
  });

  code += '\n// Export combined schemas\n';
  code += 'export const schemas = {\n';
  Object.keys(schemas).forEach((schemaName) => {
    const normalizedName = normalizeSchemaName(schemaName);
    code += `  ${normalizedName},\n`;
  });
  code += '};\n';

  return code;
}

/**
 * Generate TypeScript code with MCP tool mappings from OpenAPI spec
 */
function generateMcpToolsCode(openApiSpec) {
  let code = `import { z } from 'zod';\n`;
  code += `import { schemas, message } from './zod-schemas.js';\n\n`;

  code += `// MCP Tool definition interface\n`;
  code += `export interface McpToolDefinition {\n`;
  code += `  name: string;\n`;
  code += `  description: string;\n`;
  code += `  inputSchema: z.ZodRawShape;\n`;
  code += `  parameters?: Record<string, any>;\n`;
  code += `}\n\n`;

  code += `// Tool creation function\n`;
  code += `export function createMcpTool(def: McpToolDefinition): McpToolDefinition {\n`;
  code += `  return def;\n`;
  code += `}\n\n`;

  code += `// Generated MCP tool definitions\n`;
  for (const path in openApiSpec.paths || {}) {
    for (const method in openApiSpec.paths[path] || {}) {
      const operation = openApiSpec.paths[path][method];
      if (!operation || typeof operation !== 'object') continue;

      const operationId =
        operation.operationId || `${method}${path.replace(/\//g, '_').replace(/[{}]/g, '')}`;
      const safeOperationId = operationId.replace(/-/g, '_');

      const description = operation.description || operation.summary || operationId;

      const schemaRef = operation.requestBody?.content?.['application/json']?.schema?.$ref;
      let schemaName = '';
      let inputSchema = 'z.object({}).passthrough()';

      if (schemaRef) {
        schemaName = schemaRef.replace('#/components/schemas/', '');
        inputSchema = normalizeSchemaName(schemaName);
      }
      code += `export const ${safeOperationId}Tool = createMcpTool({\n`;
      code += `  name: "${operationId}",\n`;
      code += `  description: ${JSON.stringify(description)},\n`;
      code += `  inputSchema: ${inputSchema}.schema.shape,\n`;
      code += `  parameters: {\n`;
      code += `    method: "${method.toUpperCase()}",\n`;
      code += `    path: "${path}",\n`;
      code += `    schemaName: "${schemaName}"\n`;
      code += `  }\n`;
      code += `});\n\n`;
    }
  }

  code += `// Export all tools\n`;
  code += `export const mcpTools = {\n`;
  for (const path in openApiSpec.paths || {}) {
    for (const method in openApiSpec.paths[path] || {}) {
      const operation = openApiSpec.paths[path][method];
      if (!operation || typeof operation !== 'object') continue;

      const operationId =
        operation.operationId || `${method}${path.replace(/\//g, '_').replace(/[{}]/g, '')}`;
      const safeOperationId = operationId.replace(/-/g, '_');
      code += `  "${operationId}": ${safeOperationId}Tool,\n`;
    }
  }
  code += `};\n`;

  return code;
}

/**
 * Normalize schema name for TypeScript
 */
function normalizeSchemaName(schemaName) {
  return schemaName
    .replace(/microsoft\.graph\./g, '')
    .replace(/\./g, '_')
    .replace(/-/g, '_');
}

/**
 * Generate Zod schema for a specific definition
 */
function generateZodSchemaForDefinition(schema, allSchemas, parentRefs = []) {
  if (schema.$ref) {
    const refName = schema.$ref.replace('#/components/schemas/', '');
    if (parentRefs.includes(refName)) {
      return normalizeSchemaName(refName);
    }
    return normalizeSchemaName(refName);
  }

  if (schema.allOf) {
    const subSchemas = schema.allOf.map((s) =>
      generateZodSchemaForDefinition(s, allSchemas, [...parentRefs])
    );
    return `z.intersection(${subSchemas.join(', ')})`;
  }

  if (schema.anyOf) {
    const subSchemas = schema.anyOf.map((s) =>
      generateZodSchemaForDefinition(s, allSchemas, [...parentRefs])
    );
    return `z.union([${subSchemas.join(', ')}])`;
  }

  if (schema.oneOf) {
    const subSchemas = schema.oneOf.map((s) =>
      generateZodSchemaForDefinition(s, allSchemas, [...parentRefs])
    );
    return `z.union([${subSchemas.join(', ')}])`;
  }

  if (schema.enum) {
    const enumValues = schema.enum.map((value) =>
      typeof value === 'string' ? `'${value}'` : value
    );
    return `z.enum([${enumValues.join(', ')}])`;
  }
  switch (schema.type) {
    case 'string':
      let stringSchema = 'z.string()';

      if (schema.format === 'date-time') {
        stringSchema = `z.string().datetime()`;
      } else if (schema.format === 'date') {
        stringSchema = `z.string().datetime()`;
      } else if (schema.format === 'email') {
        stringSchema = `z.string().email()`;
      } else if (schema.format === 'uri') {
        stringSchema = `z.string().url()`;
      }

      if (schema.pattern) {
        stringSchema = `${stringSchema}.regex(/${schema.pattern}/)`;
      }

      if (schema.minLength !== undefined) {
        stringSchema = `${stringSchema}.min(${schema.minLength})`;
      }

      if (schema.maxLength !== undefined) {
        stringSchema = `${stringSchema}.max(${schema.maxLength})`;
      }

      return stringSchema;

    case 'number':
    case 'integer':
      let numberSchema = 'z.number()';

      if (schema.minimum !== undefined) {
        numberSchema = `${numberSchema}.min(${schema.minimum})`;
      }

      if (schema.maximum !== undefined) {
        numberSchema = `${numberSchema}.max(${schema.maximum})`;
      }

      if (schema.multipleOf !== undefined) {
        numberSchema = `${numberSchema}.multipleOf(${schema.multipleOf})`;
      }

      return numberSchema;

    case 'boolean':
      return 'z.boolean()';

    case 'null':
      return 'z.null()';

    case 'array':
      const itemsSchema = generateZodSchemaForDefinition(schema.items || {}, allSchemas, [
        ...parentRefs,
      ]);
      return `z.array(${itemsSchema})`;

    case 'object':
      const properties = schema.properties || {};
      const required = schema.required || [];

      if (Object.keys(properties).length === 0) {
        return 'z.object({}).passthrough()';
      }

      const propLines = Object.entries(properties).map(([propName, propSchema]) => {
        const propZodSchema = generateZodSchemaForDefinition(propSchema, allSchemas, [
          ...parentRefs,
        ]);
        const isRequired = required.includes(propName);
        return `    ${JSON.stringify(propName)}: ${propZodSchema}${isRequired ? '' : '.optional()'}`;
      });

      return `z.object({\n${propLines.join(',\n')}\n  }).passthrough()`;

    default:
      return 'z.any()';
  }
}
