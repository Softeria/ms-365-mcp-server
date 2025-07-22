import fs from 'fs';
import yaml from 'js-yaml';

export function createAndSaveSimplifiedOpenAPI(endpointsFile, openapiFile, openapiTrimmedFile) {
  const allEndpoints = JSON.parse(fs.readFileSync(endpointsFile, 'utf8'));
  const endpoints = allEndpoints.filter((endpoint) => !endpoint.disabled);

  const spec = fs.readFileSync(openapiFile, 'utf8');
  const openApiSpec = yaml.load(spec);

  for (const endpoint of endpoints) {
    if (!openApiSpec.paths[endpoint.pathPattern]) {
      throw new Error(`Path "${endpoint.pathPattern}" not found in OpenAPI spec.`);
    }
  }

  for (const [key, value] of Object.entries(openApiSpec.paths)) {
    const e = endpoints.filter((ep) => ep.pathPattern === key);
    if (e.length === 0) {
      delete openApiSpec.paths[key];
    } else {
      for (const [method, operation] of Object.entries(value)) {
        const eo = e.find((ep) => ep.method.toLowerCase() === method);
        if (eo) {
          operation.operationId = eo.toolName;
        } else {
          delete value[method];
        }
      }
    }
  }

  if (openApiSpec.components && openApiSpec.components.schemas) {
    removeODataTypeRecursively(openApiSpec.components.schemas);
    flattenComplexSchemasRecursively(openApiSpec.components.schemas);
  }

  if (openApiSpec.paths) {
    removeODataTypeRecursively(openApiSpec.paths);
    simplifyAnyOfInPaths(openApiSpec.paths);
  }

  console.log('🧹 Pruning unused schemas...');
  const usedSchemas = findUsedSchemas(openApiSpec);
  pruneUnusedSchemas(openApiSpec, usedSchemas);

  fs.writeFileSync(openapiTrimmedFile, yaml.dump(openApiSpec));
}

function removeODataTypeRecursively(obj) {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    obj.forEach((item) => removeODataTypeRecursively(item));
    return;
  }

  Object.keys(obj).forEach((key) => {
    if (key === '@odata.type') {
      delete obj[key];
    } else {
      removeODataTypeRecursively(obj[key]);
    }
  });
}

function simplifyAnyOfInPaths(paths) {
  Object.entries(paths).forEach(([pathKey, pathItem]) => {
    if (!pathItem || typeof pathItem !== 'object') return;

    Object.entries(pathItem).forEach(([method, operation]) => {
      if (!operation || typeof operation !== 'object') return;

      if (operation.parameters && Array.isArray(operation.parameters)) {
        operation.parameters.forEach((param) => {
          if (param.schema && param.schema.anyOf) {
            simplifyAnyOfSchema(param.schema, `Path ${pathKey} ${method} parameter`);
          }
        });
      }

      if (operation.requestBody && operation.requestBody.content) {
        Object.entries(operation.requestBody.content).forEach(([mediaType, mediaTypeObj]) => {
          if (mediaTypeObj.schema && mediaTypeObj.schema.anyOf) {
            simplifyAnyOfSchema(
              mediaTypeObj.schema,
              `Path ${pathKey} ${method} requestBody ${mediaType}`
            );
          }
        });
      }

      if (operation.responses) {
        Object.entries(operation.responses).forEach(([statusCode, response]) => {
          if (response.content) {
            Object.entries(response.content).forEach(([mediaType, mediaTypeObj]) => {
              if (mediaTypeObj.schema && mediaTypeObj.schema.anyOf) {
                simplifyAnyOfSchema(
                  mediaTypeObj.schema,
                  `Path ${pathKey} ${method} response ${statusCode} ${mediaType}`
                );
              }
            });
          }
        });
      }
    });
  });
}

function simplifyAnyOfSchema(schema, context) {
  if (!schema.anyOf || !Array.isArray(schema.anyOf)) return;

  const anyOfItems = schema.anyOf;

  if (anyOfItems.length === 2) {
    const hasRef = anyOfItems.some((item) => item.$ref);
    const hasNullableObject = anyOfItems.some(
      (item) => item.type === 'object' && item.nullable === true && Object.keys(item).length <= 2
    );

    if (hasRef && hasNullableObject) {
      console.log(`Simplifying anyOf in ${context} (ref + nullable object pattern)`);
      const refItem = anyOfItems.find((item) => item.$ref);
      delete schema.anyOf;
      schema.$ref = refItem.$ref;
      schema.nullable = true;
    }
  } else if (anyOfItems.length > 2) {
    console.log(`Simplifying anyOf in ${context} (multiple options)`);
    schema.type = anyOfItems[0].type || 'object';
    schema.nullable = true;
    schema.description = `${schema.description || ''} [Simplified from ${
      anyOfItems.length
    } options]`.trim();
    delete schema.anyOf;
  }
}

function flattenComplexSchemasRecursively(schemas) {
  Object.entries(schemas).forEach(([schemaName, schema]) => {
    if (!schema || typeof schema !== 'object') return;

    flattenComplexSchema(schema, schemaName);

    if (schema.allOf) {
      const flattenedSchema = mergeAllOfSchemas(schema.allOf, schemas);
      Object.assign(schema, flattenedSchema);
      delete schema.allOf;
    }

    if (schema.properties && shouldReduceProperties(schema)) {
      reduceProperties(schema, schemaName);
    }

    if (schema.properties) {
      simplifyNestedPropertiesRecursively(schema.properties);
    }
  });
}

function flattenComplexSchema(schema, schemaName) {
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    if (schema.anyOf.length === 2) {
      const hasRef = schema.anyOf.some((item) => item.$ref);
      const hasNullableObject = schema.anyOf.some(
        (item) => item.type === 'object' && item.nullable === true && Object.keys(item).length <= 2
      );

      if (hasRef && hasNullableObject) {
        console.log(`Simplifying anyOf in ${schemaName} (ref + nullable object pattern)`);
        const refItem = schema.anyOf.find((item) => item.$ref);
        delete schema.anyOf;
        schema.$ref = refItem.$ref;
        schema.nullable = true;
      }
    } else if (schema.anyOf.length > 2) {
      console.log(`Simplifying anyOf in ${schemaName} (${schema.anyOf.length} options)`);
      const firstOption = schema.anyOf[0];
      schema.type = firstOption.type || 'object';
      schema.nullable = true;
      schema.description = `${schema.description || ''} [Simplified from ${
        schema.anyOf.length
      } options]`.trim();
      delete schema.anyOf;
    }
  }

  if (schema.oneOf && Array.isArray(schema.oneOf) && schema.oneOf.length > 2) {
    console.log(`Simplifying oneOf in ${schemaName} (${schema.oneOf.length} options)`);
    const firstOption = schema.oneOf[0];
    schema.type = firstOption.type || 'object';
    schema.nullable = true;
    schema.description = `${schema.description || ''} [Simplified from ${
      schema.oneOf.length
    } options]`.trim();
    delete schema.oneOf;
  }
}

function shouldReduceProperties(schema) {
  if (!schema.properties) return false;
  const propertyCount = Object.keys(schema.properties).length;
  return propertyCount > 25;
}

function reduceProperties(schema, schemaName) {
  const properties = schema.properties;
  const propertyCount = Object.keys(properties).length;

  if (propertyCount > 25) {
    console.log(`Reducing properties in ${schemaName} (${propertyCount} -> 25)`);

    const priorityProperties = [
      'id',
      'name',
      'displayName',
      'description',
      'createdDateTime',
      'lastModifiedDateTime',
      'status',
      'state',
      'type',
      'value',
      'email',
      'userPrincipalName',
      'title',
      'content',
      'body',
      'subject',
      'message',
      'error',
      'code',
      'details',
      'url',
      'href',
      'path',
      'method',
      'enabled',
    ];

    const keptProperties = {};
    const propertyKeys = Object.keys(properties);

    priorityProperties.forEach((key) => {
      if (properties[key]) {
        keptProperties[key] = properties[key];
      }
    });

    const remainingSlots = 25 - Object.keys(keptProperties).length;
    const otherKeys = propertyKeys.filter((key) => !keptProperties[key]);

    otherKeys.slice(0, remainingSlots).forEach((key) => {
      keptProperties[key] = properties[key];
    });

    schema.properties = keptProperties;
    schema.additionalProperties = true;
    schema.description = `${
      schema.description || ''
    } [Note: Simplified from ${propertyCount} properties to 25 most common ones]`.trim();
  }
}

function mergeAllOfSchemas(allOfArray, allSchemas) {
  const merged = {
    type: 'object',
    properties: {},
  };

  allOfArray.forEach((item) => {
    if (item.$ref) {
      const refSchemaName = item.$ref.replace('#/components/schemas/', '');
      const refSchema = allSchemas[refSchemaName];
      if (refSchema) {
        console.log(
          `Processing ref ${refSchemaName} for ${item.title}, exists: true, has properties: ${!!refSchema.properties}`
        );
        if (refSchema.properties) {
          console.log(`Ensuring ${item.title} has all required properties from ${refSchemaName}`);
          Object.assign(merged.properties, refSchema.properties);
        }
        if (refSchema.required) {
          merged.required = [...(merged.required || []), ...refSchema.required];
        }
        if (refSchema.description && !merged.description) {
          merged.description = refSchema.description;
        }
      }
    } else if (item.properties) {
      Object.assign(merged.properties, item.properties);
      if (item.required) {
        merged.required = [...(merged.required || []), ...item.required];
      }
    }
  });

  if (merged.required) {
    merged.required = [...new Set(merged.required)];
  }

  return merged;
}

function simplifyNestedPropertiesRecursively(properties, currentDepth = 0, maxDepth = 3) {
  if (!properties || typeof properties !== 'object' || currentDepth >= maxDepth) {
    return;
  }

  Object.keys(properties).forEach((key) => {
    const prop = properties[key];

    if (prop && typeof prop === 'object') {
      if (currentDepth === maxDepth - 1 && prop.properties) {
        console.log(`Flattening nested property at depth ${currentDepth}: ${key}`);
        prop.type = 'object';
        prop.description = `${prop.description || ''} [Simplified: nested object]`.trim();
        delete prop.properties;
        delete prop.additionalProperties;
      } else if (prop.properties) {
        simplifyNestedPropertiesRecursively(prop.properties, currentDepth + 1, maxDepth);
      }

      if (prop.anyOf && Array.isArray(prop.anyOf)) {
        if (prop.anyOf.length === 2) {
          const hasRef = prop.anyOf.some((item) => item.$ref);
          const hasNullableObject = prop.anyOf.some(
            (item) =>
              item.type === 'object' && item.nullable === true && Object.keys(item).length <= 2
          );

          if (hasRef && hasNullableObject) {
            console.log(`Simplifying anyOf in property ${key} (ref + nullable object pattern)`);
            const refItem = prop.anyOf.find((item) => item.$ref);
            delete prop.anyOf;
            prop.$ref = refItem.$ref;
            prop.nullable = true;
          }
        } else if (prop.anyOf.length > 2) {
          prop.type = prop.anyOf[0].type || 'object';
          prop.nullable = true;
          prop.description =
            `${prop.description || ''} [Simplified from ${prop.anyOf.length} options]`.trim();
          delete prop.anyOf;
        }
      }

      if (prop.oneOf && Array.isArray(prop.oneOf) && prop.oneOf.length > 2) {
        prop.type = prop.oneOf[0].type || 'object';
        prop.nullable = true;
        prop.description =
          `${prop.description || ''} [Simplified from ${prop.oneOf.length} options]`.trim();
        delete prop.oneOf;
      }
    }
  });
}

function findUsedSchemas(openApiSpec) {
  const usedSchemas = new Set();
  const schemasToProcess = [];
  const schemas = openApiSpec.components?.schemas || {};
  const responses = openApiSpec.components?.responses || {};
  const paths = openApiSpec.paths || {};

  Object.entries(paths).forEach(([, pathItem]) => {
    Object.entries(pathItem).forEach(([, operation]) => {
      if (typeof operation !== 'object') return;

      if (operation.requestBody?.content) {
        Object.values(operation.requestBody.content).forEach((content) => {
          if (content.schema?.$ref) {
            const schemaName = content.schema.$ref.replace('#/components/schemas/', '');
            schemasToProcess.push(schemaName);
          }
        });
      }

      if (operation.responses) {
        Object.entries(operation.responses).forEach(([, response]) => {
          if (response.$ref) {
            const responseName = response.$ref.replace('#/components/responses/', '');
            const responseDefinition = responses[responseName];
            if (responseDefinition?.content) {
              Object.values(responseDefinition.content).forEach((content) => {
                if (content.schema?.$ref) {
                  const schemaName = content.schema.$ref.replace('#/components/schemas/', '');
                  schemasToProcess.push(schemaName);
                }
              });
            }
          }

          if (response.content) {
            Object.values(response.content).forEach((content) => {
              if (content.schema?.$ref) {
                const schemaName = content.schema.$ref.replace('#/components/schemas/', '');
                schemasToProcess.push(schemaName);
              }
            });
          }
        });
      }

      if (operation.parameters) {
        operation.parameters.forEach((param) => {
          if (param.schema?.$ref) {
            const schemaName = param.schema.$ref.replace('#/components/schemas/', '');
            schemasToProcess.push(schemaName);
          }
        });
      }
    });
  });

  const visited = new Set();

  function processSchema(schemaName) {
    if (visited.has(schemaName)) return;
    visited.add(schemaName);

    const schema = schemas[schemaName];
    if (!schema) {
      console.log(`⚠️  Warning: Schema ${schemaName} not found`);
      return;
    }

    usedSchemas.add(schemaName);

    findRefsInObject(schema, (ref) => {
      const refSchemaName = ref.replace('#/components/schemas/', '');
      if (schemas[refSchemaName]) {
        processSchema(refSchemaName);
      } else {
        console.log(`⚠️  Schema ${schemaName} references missing schema: ${refSchemaName}`);
      }
    });
  }

  schemasToProcess.forEach((schemaName) => processSchema(schemaName));

  [
    'microsoft.graph.ODataErrors.ODataError',
    'microsoft.graph.ODataErrors.MainError',
    'microsoft.graph.ODataErrors.ErrorDetails',
    'microsoft.graph.ODataErrors.InnerError',
  ].forEach((errorSchema) => {
    if (schemas[errorSchema]) {
      processSchema(errorSchema);
    }
  });

  console.log(
    `   Found ${usedSchemas.size} used schemas out of ${Object.keys(schemas).length} total schemas`
  );

  return usedSchemas;
}

function findRefsInObject(obj, callback, visited = new Set()) {
  if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
  visited.add(obj);

  if (Array.isArray(obj)) {
    obj.forEach((item) => findRefsInObject(item, callback, visited));
    return;
  }

  Object.entries(obj).forEach(([key, value]) => {
    if (key === '$ref' && typeof value === 'string' && value.startsWith('#/components/schemas/')) {
      callback(value);
    } else if (typeof value === 'object') {
      findRefsInObject(value, callback, visited);
    }
  });
}

function cleanBrokenRefs(obj, availableSchemas, visited = new Set()) {
  if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
  visited.add(obj);

  if (Array.isArray(obj)) {
    for (let i = obj.length - 1; i >= 0; i--) {
      const item = obj[i];
      if (item && typeof item === 'object' && item.$ref) {
        const refSchemaName = item.$ref.replace('#/components/schemas/', '');
        if (!availableSchemas[refSchemaName]) {
          console.log(`   Removing broken reference: ${refSchemaName}`);
          obj.splice(i, 1);
        }
      } else if (typeof item === 'object') {
        cleanBrokenRefs(item, availableSchemas, visited);
      }
    }
    return;
  }

  Object.entries(obj).forEach(([key, value]) => {
    if (key === '$ref' && typeof value === 'string' && value.startsWith('#/components/schemas/')) {
      const refSchemaName = value.replace('#/components/schemas/', '');
      if (!availableSchemas[refSchemaName]) {
        console.log(`   Removing broken $ref: ${refSchemaName}`);
        delete obj[key];
        if (Object.keys(obj).length === 0) {
          obj.type = 'object';
        }
      }
    } else if (typeof value === 'object') {
      cleanBrokenRefs(value, availableSchemas, visited);
    }
  });
}

function pruneUnusedSchemas(openApiSpec, usedSchemas) {
  const schemas = openApiSpec.components?.schemas || {};
  const originalCount = Object.keys(schemas).length;

  Object.keys(schemas).forEach((schemaName) => {
    if (!usedSchemas.has(schemaName)) {
      delete schemas[schemaName];
    }
  });

  Object.values(schemas).forEach((schema) => {
    if (schema) {
      cleanBrokenRefs(schema, schemas);
    }
  });

  if (openApiSpec.components?.responses) {
    Object.values(openApiSpec.components.responses).forEach((response) => {
      if (response) {
        cleanBrokenRefs(response, schemas);
      }
    });
  }

  if (openApiSpec.paths) {
    Object.values(openApiSpec.paths).forEach((pathItem) => {
      if (pathItem) {
        cleanBrokenRefs(pathItem, schemas);
      }
    });
  }

  const newCount = Object.keys(schemas).length;
  const reduction = (((originalCount - newCount) / originalCount) * 100).toFixed(1);

  console.log(`   Removed ${originalCount - newCount} unused schemas (${reduction}% reduction)`);
  console.log(`   Final schema count: ${newCount} (from ${originalCount})`);

  if (openApiSpec.components?.responses) {
    const usedResponses = new Set();

    Object.values(openApiSpec.paths || {}).forEach((pathItem) => {
      Object.values(pathItem).forEach((operation) => {
        if (operation.responses) {
          Object.values(operation.responses).forEach((response) => {
            if (response.$ref) {
              const responseName = response.$ref.replace('#/components/responses/', '');
              usedResponses.add(responseName);
            }
          });
        }
      });
    });

    usedResponses.add('error');

    const responses = openApiSpec.components.responses;
    const originalResponseCount = Object.keys(responses).length;

    Object.keys(responses).forEach((responseName) => {
      if (!usedResponses.has(responseName)) {
        delete responses[responseName];
      }
    });

    const newResponseCount = Object.keys(responses).length;
    console.log(
      `   Removed ${originalResponseCount - newResponseCount} unused responses (from ${originalResponseCount} to ${newResponseCount})`
    );
  }

  if (openApiSpec.components?.requestBodies) {
    const usedRequestBodies = new Set();

    Object.values(openApiSpec.paths || {}).forEach((pathItem) => {
      Object.values(pathItem).forEach((operation) => {
        if (operation.requestBody?.$ref) {
          const requestBodyName = operation.requestBody.$ref.replace(
            '#/components/requestBodies/',
            ''
          );
          usedRequestBodies.add(requestBodyName);
        }
      });
    });

    const requestBodies = openApiSpec.components.requestBodies;
    const originalRequestBodyCount = Object.keys(requestBodies).length;

    Object.keys(requestBodies).forEach((requestBodyName) => {
      if (!usedRequestBodies.has(requestBodyName)) {
        delete requestBodies[requestBodyName];
      }
    });

    const newRequestBodyCount = Object.keys(requestBodies).length;
    console.log(
      `   Removed ${originalRequestBodyCount - newRequestBodyCount} unused request bodies (from ${originalRequestBodyCount} to ${newRequestBodyCount})`
    );
  }
}
