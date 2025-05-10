/**
 * Module for converting the bundled OpenAPI YAML to JSON and simplifying it
 */

import fs from 'fs';
import yaml from 'js-yaml';

/**
 * Convert YAML to JSON and simplify the OpenAPI document
 *
 * @param {string} yamlFile - Path to the bundled YAML file
 * @param {string} jsonFile - Path to output the simplified JSON
 * @returns {string} - Path to the JSON file
 */
export function simplifyOpenApiSpec(yamlFile, jsonFile) {
  try {
    console.log('Converting bundled YAML to JSON...');

    // Parse YAML file
    const yamlContent = fs.readFileSync(yamlFile, 'utf8');
    const jsonSpec = yaml.load(yamlContent);

    // Further simplify the OpenAPI document to reduce memory requirements
    console.log('Simplifying OpenAPI document for code generation...');

    // Remove extraneous fields that aren't needed for type generation
    if (jsonSpec.info) {
      // Simplify info
      jsonSpec.info = {
        title: jsonSpec.info.title || 'Microsoft Graph API',
        version: jsonSpec.info.version || '1.0.0',
      };
    }

    // Remove servers, security, tags sections
    delete jsonSpec.servers;
    delete jsonSpec.security;
    delete jsonSpec.tags;

    // Keep only the first operation for each path (we only care about types)
    let simplifiedPaths = 0;
    Object.keys(jsonSpec.paths || {}).forEach((path) => {
      const methods = Object.keys(jsonSpec.paths[path]).filter((key) =>
        ['get', 'post', 'put', 'delete', 'patch'].includes(key)
      );

      if (methods.length > 1) {
        // Keep only the first method
        const firstMethod = methods[0];

        // Clear all methods and keep only the first one
        Object.keys(jsonSpec.paths[path]).forEach((key) => {
          if (key !== firstMethod && ['get', 'post', 'put', 'delete', 'patch'].includes(key)) {
            delete jsonSpec.paths[path][key];
          }
        });

        simplifiedPaths++;
      }
    });

    console.log(`Simplified ${simplifiedPaths} paths with multiple operations`);

    // Write JSON to file
    fs.writeFileSync(jsonFile, JSON.stringify(jsonSpec, null, 2));

    console.log(`Simplified OpenAPI spec saved as JSON to: ${jsonFile}`);
    return jsonFile;
  } catch (error) {
    throw new Error(`Error simplifying OpenAPI specification: ${error.message}`);
  }
}
