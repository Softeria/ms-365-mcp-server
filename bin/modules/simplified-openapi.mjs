import fs from 'fs';
import yaml from 'js-yaml';

export function createAndSaveSimplifiedOpenAPI(endpointsFile, openapiFile, openapiTrimmedFile) {
  const endpoints = JSON.parse(fs.readFileSync(endpointsFile, 'utf8'));

  const spec = fs.readFileSync(openapiFile, 'utf8');
  const openApiSpec = yaml.load(spec);
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

  fs.writeFileSync(openapiTrimmedFile, yaml.dump(openApiSpec));
}
