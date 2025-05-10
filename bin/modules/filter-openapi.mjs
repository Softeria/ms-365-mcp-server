/**
 * Module for filtering the OpenAPI specification based on endpoints
 */

import fs from 'fs';
import yaml from 'js-yaml';

/**
 * Convert endpoint format to match OpenAPI format
 *
 * @param {string} pathPattern - Path pattern from endpoints.json
 * @returns {string} - Path pattern in OpenAPI format
 */
function convertPathToOpenApiFormat(pathPattern) {
  // Convert path pattern to match OpenAPI format by replacing parameters
  // e.g., "/me/mailFolders/{mailFolder-id}" to "/me/mailFolders/{mailFolder_id}"
  let path = pathPattern.replace(/\{([^}]+)\}/g, (match, param) => {
    // Replace hyphens with underscores in parameter names to match OpenAPI format
    const normalizedParam = param.replace(/-/g, '_');
    return `{${normalizedParam}}`;
  });

  // For parameters with numbers (like driveItem-id1), handle them specially
  path = path.replace(/\{([^}]+)_id(\d+)\}/g, (match, param, num) => {
    return `{${param}_id_${num}}`;
  });

  // Ensure the path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  return path;
}

/**
 * Create an operations map from endpoints.json
 *
 * @param {string} endpointsFile - Path to the endpoints.json file
 * @returns {Object} - Operations map and count
 */
function createOperationsMapFromEndpoints(endpointsFile) {
  if (!fs.existsSync(endpointsFile)) {
    throw new Error(`Endpoints file not found at ${endpointsFile}`);
  }

  try {
    const endpoints = JSON.parse(fs.readFileSync(endpointsFile, 'utf8'));

    // Create a map for fast lookup: { path: { method: true } }
    const operationsMap = {};

    endpoints.forEach((endpoint) => {
      const path = convertPathToOpenApiFormat(endpoint.pathPattern);
      const method = endpoint.method.toLowerCase();

      if (!operationsMap[path]) {
        operationsMap[path] = {};
      }

      operationsMap[path][method] = true;
    });

    return {
      operationsMap,
      count: endpoints.length,
    };
  } catch (error) {
    throw new Error(`Error processing endpoints file: ${error.message}`);
  }
}

/**
 * Filter the OpenAPI specification based on endpoints
 *
 * @param {string} sourceFile - Path to the source OpenAPI spec
 * @param {string} targetFile - Path to write the filtered spec
 * @param {string} endpointsFile - Path to the endpoints.json file
 * @returns {boolean} - Success status
 */
export function filterOpenApiSpec(sourceFile, targetFile, endpointsFile) {
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`OpenAPI file not found at ${sourceFile}`);
  }

  try {
    console.log('Creating operations map from endpoints.json');
    const { operationsMap, count } = createOperationsMapFromEndpoints(endpointsFile);

    console.log(`Found ${count} operations to include`);
    console.log('Filtering OpenAPI specification...');

    // Parse YAML file
    const openApiDoc = yaml.load(fs.readFileSync(sourceFile, 'utf8'));

    // Create a new paths object with only the paths we want
    const newPaths = {};

    // Go through each path in the original spec
    Object.keys(openApiDoc.paths || {}).forEach((path) => {
      // If this path matches one of our paths
      if (operationsMap[path]) {
        // Add this path to our new paths object
        newPaths[path] = {};

        // For each HTTP method in this path
        Object.keys(openApiDoc.paths[path]).forEach((method) => {
          // Skip non-HTTP method properties (like parameters)
          if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
            // Copy the non-HTTP method properties (they apply to all methods)
            newPaths[path][method] = openApiDoc.paths[path][method];
            return;
          }

          // Include this method if it's in our operations map
          if (operationsMap[path][method]) {
            newPaths[path][method] = openApiDoc.paths[path][method];
          }
        });

        // If we didn't add any methods to this path, remove the path
        if (Object.keys(newPaths[path]).length === 0) {
          delete newPaths[path];
        }
      }
    });

    // Replace the paths in the original spec
    openApiDoc.paths = newPaths;

    // Write the filtered spec to the target file
    fs.writeFileSync(targetFile, yaml.dump(openApiDoc));

    console.log(`Filtered OpenAPI spec written to ${targetFile}`);
    console.log(`Included ${Object.keys(newPaths).length} paths`);

    return true;
  } catch (error) {
    throw new Error(`Error filtering OpenAPI file: ${error.message}`);
  }
}
