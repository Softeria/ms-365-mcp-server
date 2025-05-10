#!/usr/bin/env node

/**
 * Microsoft Graph API Client Generator Script
 *
 * This orchestrator script manages the process of:
 * 1. Downloading the Microsoft Graph API OpenAPI specification
 * 2. Filtering and processing the specification
 * 3. Generating client code
 *
 * It uses modular components for each step of the process.
 */

import path from 'path';
import { fileURLToPath } from 'url';
// Import modules
import { downloadGraphOpenAPI } from './modules/download-openapi.mjs';
import { filterOpenApiSpec } from './modules/filter-openapi.mjs';
import { bundleOpenApiSpec } from './modules/bundle-openapi.mjs';
import { simplifyOpenApiSpec } from './modules/simplify-openapi.mjs';
import { generateZodClient } from './modules/generate-client.mjs';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const modulesDir = path.join(__dirname, 'modules');
const openapiDir = path.join(rootDir, 'openapi');
const srcDir = path.join(rootDir, 'src');

// File paths
const openapiFile = path.join(openapiDir, 'openapi.yaml');
const filteredOpenapiFile = path.join(openapiDir, 'openapi-filtered.yaml');
const bundledOpenapiFile = path.join(openapiDir, 'openapi-bundled.yaml');
const simplifiedJsonFile = path.join(openapiDir, 'openapi-simplified.json');
const endpointsFile = path.join(srcDir, 'endpoints.json');

// Output paths
const generatedDir = path.join(srcDir, 'generated');
const schemaOutputFile = path.join(generatedDir, 'openapi-schema.json');
const readmeOutputFile = path.join(generatedDir, 'README.md');

// Command line arguments
const args = process.argv.slice(2);
const forceDownload = args.includes('--force');

// OpenAPI URL
const OPENAPI_URL =
  'https://raw.githubusercontent.com/microsoftgraph/msgraph-metadata/refs/heads/master/openapi/v1.0/openapi.yaml';

/**
 * Main function
 */
async function main() {
  console.log('Microsoft Graph API Client Generation Process');
  console.log('--------------------------------------------');

  try {
    // Step 1: Download the OpenAPI specification
    console.log('\n📥 Step 1: Downloading OpenAPI specification');
    await downloadGraphOpenAPI(openapiDir, openapiFile, OPENAPI_URL, forceDownload);

    // Step 2: Filter the OpenAPI specification based on endpoints
    console.log('\n🔍 Step 2: Filtering OpenAPI specification');
    filterOpenApiSpec(openapiFile, filteredOpenapiFile, endpointsFile);

    // Step 3: Bundle and clean up the filtered spec
    console.log('\n📦 Step 3: Bundling and cleaning up the OpenAPI specification');
    bundleOpenApiSpec(filteredOpenapiFile, bundledOpenapiFile, openapiFile);

    // Step 4: Convert to JSON and simplify
    console.log('\n🔧 Step 4: Converting to JSON and simplifying');
    simplifyOpenApiSpec(bundledOpenapiFile, simplifiedJsonFile);

    // Step 5: Generate client code
    console.log('\n🚀 Step 5: Generating Zod client code');
    generateZodClient(simplifiedJsonFile, generatedDir, schemaOutputFile, readmeOutputFile);

    console.log('\n✅ Process completed successfully');
  } catch (error) {
    console.error('\n❌ Error during process:', error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
