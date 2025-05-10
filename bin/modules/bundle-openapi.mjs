/**
 * Module for bundling and cleaning up the OpenAPI specification
 */

import fs from 'fs';
import { execSync } from 'child_process';

/**
 * Bundle and clean up the OpenAPI specification using Redocly CLI
 *
 * @param {string} sourceFile - Path to the filtered OpenAPI spec
 * @param {string} targetFile - Path to write the bundled spec
 * @param {string} originalFile - Path to the original OpenAPI spec (for stats)
 * @returns {boolean} - Success status
 */
export function bundleOpenApiSpec(sourceFile, targetFile, originalFile) {
  try {
    console.log('Bundling and cleaning up OpenAPI specification with Redocly...');

    // Use Redocly CLI to bundle and remove unused components
    const command = `npx @redocly/cli bundle ${sourceFile} --output ${targetFile} --remove-unused-components`;

    console.log(`Executing: ${command}`);
    // Increase timeout to 10 minutes (600000ms)
    execSync(command, { stdio: 'inherit', timeout: 600000 });

    // Log some stats
    if (fs.existsSync(originalFile)) {
      console.log(`Original file size: ${fs.statSync(originalFile).size} bytes`);
    }
    console.log(`Filtered file size: ${fs.statSync(sourceFile).size} bytes`);
    console.log(`Final bundled file size: ${fs.statSync(targetFile).size} bytes`);

    // Clean up temporary file if desired
    // fs.unlinkSync(sourceFile);
    // console.log(`Temporary filtered file removed`);

    return true;
  } catch (error) {
    throw new Error(`Error bundling OpenAPI file with Redocly: ${error.message}`);
  }
}
