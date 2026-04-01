import fs from 'fs';
import yaml from 'js-yaml';

/**
 * Generate a pre-processed schema index JSON from the trimmed OpenAPI spec
 * and endpoints.json. This index is optimised for fast lookups at runtime
 * by the schema introspection MCP tools.
 */
export function generateSchemaIndex(endpointsFile, openapiTrimmedFile, outputFile) {
  console.log('Loading endpoints.json and trimmed OpenAPI spec...');
  const endpoints = JSON.parse(fs.readFileSync(endpointsFile, 'utf8'));
  const spec = yaml.load(fs.readFileSync(openapiTrimmedFile, 'utf8'));

  const index = {
    generatedAt: new Date().toISOString(),
    endpoints: {},
    schemas: {},
  };

  // Process each endpoint from endpoints.json, enriched with OpenAPI spec data
  for (const ep of endpoints) {
    if (ep.disabled) continue;

    const specPath = spec.paths?.[ep.pathPattern];
    const specOp = specPath?.[ep.method.toLowerCase()];

    // Determine OData support from spec parameters
    const odata = {};
    const parameters = [];

    if (specOp?.parameters) {
      for (const param of specOp.parameters) {
        // Resolve $ref if needed
        const resolved = param.$ref
          ? resolveRef(param.$ref, spec)
          : param;

        if (!resolved) continue;

        const name = resolved.name || '';
        const isOdata = name.startsWith('$');

        if (isOdata) {
          const odataName = name.slice(1); // strip $
          odata[odataName] = true;
        }

        parameters.push({
          name,
          in: resolved.in || 'query',
          type: resolveParamType(resolved.schema),
          required: resolved.required || false,
          description: resolved.description || '',
        });
      }
    }

    // Extract path parameters from the pattern
    const pathParams = [...ep.pathPattern.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
    for (const pp of pathParams) {
      if (!parameters.find((p) => p.name === pp)) {
        parameters.push({
          name: pp,
          in: 'path',
          type: 'string',
          required: true,
          description: `Path parameter: ${pp}`,
        });
      }
    }

    // Extract request body schema reference
    let requestBodySchema = null;
    if (specOp?.requestBody) {
      const rb = specOp.requestBody.$ref
        ? resolveRef(specOp.requestBody.$ref, spec)
        : specOp.requestBody;
      const content = rb?.content?.['application/json'];
      if (content?.schema) {
        requestBodySchema = extractSchemaRef(content.schema);
      }
    }

    // Extract response schema reference
    let responseSchema = null;
    let responseType = 'single';
    const successResponse = specOp?.responses?.['2XX'] || specOp?.responses?.['200'];
    if (successResponse) {
      const resp = successResponse.$ref
        ? resolveRef(successResponse.$ref, spec)
        : successResponse;
      const content = resp?.content?.['application/json'];
      if (content?.schema) {
        const schemaInfo = extractResponseSchema(content.schema, spec);
        responseSchema = schemaInfo.schema;
        responseType = schemaInfo.type;
      }
    }

    // Build docs URL from spec externalDocs
    const docsUrl = specOp?.externalDocs?.url || null;

    index.endpoints[ep.toolName] = {
      method: ep.method.toUpperCase(),
      path: ep.pathPattern,
      description: specOp?.description || specOp?.summary || `${ep.method.toUpperCase()} ${ep.pathPattern}`,
      docsUrl,
      parameters,
      odata,
      requestBodySchema,
      responseSchema,
      responseType,
      scopes: ep.scopes || null,
      workScopes: ep.workScopes || null,
      orgModeRequired: !ep.scopes && !!ep.workScopes,
      llmTip: ep.llmTip || null,
    };
  }

  // Process schemas from the OpenAPI spec
  const schemas = spec.components?.schemas || {};
  for (const [schemaName, schema] of Object.entries(schemas)) {
    if (!schema || typeof schema !== 'object') continue;

    // Skip error schemas
    if (schemaName.includes('ODataErrors')) continue;

    const fields = [];
    const properties = schema.properties || {};
    const required = new Set(schema.required || []);

    for (const [fieldName, fieldDef] of Object.entries(properties)) {
      if (!fieldDef || typeof fieldDef !== 'object') continue;

      const field = {
        name: fieldName,
        type: resolveFieldType(fieldDef),
        description: fieldDef.description || '',
        nullable: fieldDef.nullable || false,
        required: required.has(fieldName),
      };

      // Include enum values if present
      if (fieldDef.enum) {
        field.enum = fieldDef.enum;
      }

      // Include $ref target for navigation
      if (fieldDef.$ref) {
        field.ref = fieldDef.$ref.replace('#/components/schemas/', '');
      } else if (fieldDef.items?.$ref) {
        field.ref = fieldDef.items.$ref.replace('#/components/schemas/', '');
      }

      fields.push(field);
    }

    index.schemas[schemaName] = {
      description: schema.description || '',
      fields,
    };
  }

  // Write the index
  const json = JSON.stringify(index, null, 2);
  fs.writeFileSync(outputFile, json);

  const endpointCount = Object.keys(index.endpoints).length;
  const schemaCount = Object.keys(index.schemas).length;
  const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);

  console.log(`   ${endpointCount} endpoints, ${schemaCount} schemas, ${sizeKB}KB`);

  return { endpointCount, schemaCount };
}

function resolveRef(ref, spec) {
  const parts = ref.replace('#/', '').split('/');
  let current = spec;
  for (const part of parts) {
    current = current?.[part];
  }
  return current;
}

function resolveParamType(schema) {
  if (!schema) return 'string';
  if (schema.type === 'array') return `array<${schema.items?.type || 'string'}>`;
  return schema.type || schema.format || 'string';
}

function resolveFieldType(fieldDef) {
  if (fieldDef.$ref) return '$ref';
  if (fieldDef.enum) return 'enum';
  if (fieldDef.type === 'array') {
    if (fieldDef.items?.$ref) return 'array<$ref>';
    return `array<${fieldDef.items?.type || 'object'}>`;
  }
  return fieldDef.type || 'object';
}

function extractSchemaRef(schema) {
  if (schema.$ref) return schema.$ref.replace('#/components/schemas/', '');
  if (schema.allOf) {
    for (const item of schema.allOf) {
      if (item.$ref) return item.$ref.replace('#/components/schemas/', '');
    }
  }
  return null;
}

function extractResponseSchema(schema, spec) {
  // Direct $ref — check if the referenced schema is a collection wrapper
  if (schema.$ref) {
    const refName = schema.$ref.replace('#/components/schemas/', '');
    const refSchema = resolveRef(schema.$ref, spec);
    if (refSchema?.properties?.value?.items?.$ref) {
      return {
        schema: refSchema.properties.value.items.$ref.replace('#/components/schemas/', ''),
        type: 'collection',
      };
    }
    return { schema: refName, type: 'single' };
  }

  // Collection pattern: allOf with a value array property
  if (schema.allOf) {
    for (const item of schema.allOf) {
      if (item.properties?.value?.items?.$ref) {
        return {
          schema: item.properties.value.items.$ref.replace('#/components/schemas/', ''),
          type: 'collection',
        };
      }
      if (item.$ref) {
        // Check if the referenced schema itself is a collection
        const refSchema = resolveRef(item.$ref, spec);
        if (refSchema?.properties?.value?.items?.$ref) {
          return {
            schema: refSchema.properties.value.items.$ref.replace('#/components/schemas/', ''),
            type: 'collection',
          };
        }
        return { schema: item.$ref.replace('#/components/schemas/', ''), type: 'single' };
      }
    }
  }

  // Inline value array
  if (schema.properties?.value?.items?.$ref) {
    return {
      schema: schema.properties.value.items.$ref.replace('#/components/schemas/', ''),
      type: 'collection',
    };
  }

  return { schema: null, type: 'unknown' };
}
