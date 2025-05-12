import fs from 'fs';
import yaml from 'js-yaml';

export function convertPathToOpenApiFormat(pathPattern) {
  let path = pathPattern.replace(/\{([^}]+)\}/g, (match, param) => {
    const normalizedParam = param.replace(/-/g, '_');
    return `{${normalizedParam}}`;
  });

  path = path.replace(/\{([^}]+)_id(\d+)\}/g, (match, param, num) => {
    return `{${param}_id_${num}}`;
  });

  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  return path;
}

export function extractDescriptions(openapiFile, endpoints) {
  console.log('Extracting descriptions from OpenAPI spec...');

  const openApiSpec = yaml.load(fs.readFileSync(openapiFile, 'utf8'));
  const descriptions = {};

  endpoints.forEach((endpoint) => {
    const path = convertPathToOpenApiFormat(endpoint.pathPattern);
    const method = endpoint.method.toLowerCase();

    if (openApiSpec.paths && openApiSpec.paths[path] && openApiSpec.paths[path][method]) {
      const operation = openApiSpec.paths[path][method];

      const description =
        operation.description || operation.summary || `Operation for ${endpoint.toolName}`;

      descriptions[endpoint.toolName] = description;
      console.log(
        `Found description for ${endpoint.toolName}: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`
      );
    } else {
      console.warn(`Path ${path} ${method} not found in OpenAPI spec`);
      descriptions[endpoint.toolName] = `Operation for ${endpoint.toolName}`;
    }
  });

  return descriptions;
}
