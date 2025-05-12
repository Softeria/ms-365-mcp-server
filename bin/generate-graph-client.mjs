#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { downloadGraphOpenAPI } from './modules/download-openapi.mjs';
import { generateMcpTools } from './modules/generate-mcp-tools.mjs';
import { createAndSaveSimplifiedOpenAPI } from './modules/simplified-openapi.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const openapiDir = path.join(rootDir, 'openapi');
const srcDir = path.join(rootDir, 'src');

const openapiFile = path.join(openapiDir, 'openapi.yaml');
const endpointsFile = path.join(srcDir, 'endpoints.json');
const simplifiedOpenapiJsonFile = path.join(openapiDir, 'openapi-simplified.json');

// Output paths for generated files
const generatedDir = path.join(srcDir, 'generated');

const args = process.argv.slice(2);
const forceDownload = args.includes('--force');

async function main() {
  console.log('Microsoft Graph API OpenAPI Processor');
  console.log('------------------------------------');

  try {
    console.log('\n📥 Step 1: Downloading OpenAPI specification');
    const downloaded = await downloadGraphOpenAPI(
      openapiDir,
      openapiFile,
      undefined,
      forceDownload
    );

    if (downloaded) {
      console.log('\n✅ OpenAPI specification successfully downloaded');
    } else {
      console.log('\n⏭️ Download skipped (file exists)');
    }

    console.log('\n🔧 Step 2: Creating simplified OpenAPI specification');
    createAndSaveSimplifiedOpenAPI(endpointsFile, simplifiedOpenapiJsonFile, openapiFile);
    console.log('✅ Successfully created simplified OpenAPI specification');

    console.log('\n🚀 Step 3: Generating Zod schemas and MCP tool mappings');
    generateMcpTools(simplifiedOpenapiJsonFile, generatedDir);
    console.log('✅ Successfully generated Zod schemas and MCP tool mappings');
  } catch (error) {
    console.error('\n❌ Error processing OpenAPI specification:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
