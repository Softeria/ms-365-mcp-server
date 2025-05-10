/**
 * Module for generating client code using openapi-zod-client
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Generate Zod client from OpenAPI schema
 *
 * @param {string} jsonFile - Path to the simplified OpenAPI JSON
 * @param {string} outputDir - Directory for generated files
 * @param {string} schemaFile - Target path for schema copy
 * @param {string} readmeFile - Target path for README
 * @returns {boolean} - Success status
 */
export function generateZodClient(jsonFile, outputDir, schemaFile, readmeFile) {
  try {
    console.log('Generating Zod client from OpenAPI spec...');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created directory: ${outputDir}`);
    }

    // Define the output file path
    const outputFilePath = path.join(outputDir, 'zod-schemas.ts');

    // Run openapi-zod-client using npx with increased memory limit
    const command = `NODE_OPTIONS="--max_old_space_size=8192" npx openapi-zod-client ${jsonFile} \\
      --output ${outputFilePath} \\
      --api-client-name MicrosoftGraphSchemas`;

    console.log(`Executing: ${command}`);
    // Increase timeout to 10 minutes (600000ms)
    execSync(command, { stdio: 'inherit', timeout: 600000 });

    console.log(`Generated Zod schemas at: ${outputFilePath}`);

    // Copy the JSON schema to the output directory for reference
    fs.copyFileSync(jsonFile, schemaFile);
    console.log(`Copied schema to ${schemaFile}`);

    // Create README
    createReadme(readmeFile);

    return true;
  } catch (error) {
    throw new Error(`Error generating Zod client: ${error.message}`);
  }
}

/**
 * Create a README for the generated directory
 *
 * @param {string} readmePath - Path to write the README
 */
function createReadme(readmePath) {
  const content = `# Generated Microsoft Graph API Types

This directory contains auto-generated TypeScript types and Zod schemas for the Microsoft Graph API.

Files in this directory:
- \`zod-schemas.ts\`: Zod schemas for validation and parsing
- \`openapi-schema.json\`: The OpenAPI schema used for generation

Do not modify these files directly. They are generated using the scripts in the \`bin/\` directory.
`;

  fs.writeFileSync(readmePath, content);
  console.log(`Created README.md at ${readmePath}`);
}
