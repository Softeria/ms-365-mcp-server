import fs from 'fs';
import yaml from 'js-yaml';

export function createAndSaveSimplifiedOpenAPI(endpointsFile, openapiFile, openapiTrimmedFile) {
  const endpoints = JSON.parse(fs.readFileSync(endpointsFile, 'utf8'));

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
  }

  fs.writeFileSync(openapiTrimmedFile, yaml.dump(openApiSpec));
}

function removeODataTypeRecursively(obj) {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    obj.forEach((item) => removeODataTypeRecursively(item));
    return;
  }

  if (obj.properties && obj.properties['@odata.type']) {
    delete obj.properties['@odata.type'];
  }

  if (obj.required && Array.isArray(obj.required)) {
    const typeIndex = obj.required.indexOf('@odata.type');
    if (typeIndex !== -1) {
      obj.required.splice(typeIndex, 1);
      if (obj.required.length === 0) {
        delete obj.required;
      }
    }
  }

  if (obj.properties) {
    removeODataTypeRecursively(obj.properties);
    Object.values(obj.properties).forEach((prop) => removeODataTypeRecursively(prop));
  }

  if (obj.additionalProperties && typeof obj.additionalProperties === 'object') {
    removeODataTypeRecursively(obj.additionalProperties);
  }

  if (obj.items) {
    removeODataTypeRecursively(obj.items);
  }

  ['allOf', 'anyOf', 'oneOf'].forEach((key) => {
    if (obj[key] && Array.isArray(obj[key])) {
      obj[key].forEach((item) => removeODataTypeRecursively(item));
    }
  });

  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      removeODataTypeRecursively(obj[key]);
    }
  });
}
