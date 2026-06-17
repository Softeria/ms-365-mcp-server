#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { downloadGraphOpenAPI, BETA_OPENAPI_URL } from './modules/download-openapi.mjs';
import { generateMcpTools } from './modules/generate-mcp-tools.mjs';
import { createAndSaveSimplifiedOpenAPI } from './modules/simplified-openapi.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const openapiDir = path.join(rootDir, 'openapi');
const srcDir = path.join(rootDir, 'src');

const endpointsFile = path.join(srcDir, 'endpoints.json');
const generatedDir = path.join(srcDir, 'generated');

// One generation target per Graph API version. Each downloads its own spec, trims it
// against the endpoints declaring that version, and emits its own client module. The
// runtime selects the URL prefix per endpoint, so the clients stay independent.
const targets = [
  {
    version: 'v1.0',
    url: undefined, // download-openapi defaults to the v1.0 spec
    specFile: path.join(openapiDir, 'openapi.yaml'),
    trimmedFile: path.join(openapiDir, 'openapi-trimmed.yaml'),
    clientFile: path.join(generatedDir, 'client.ts'),
  },
  {
    version: 'beta',
    url: BETA_OPENAPI_URL,
    specFile: path.join(openapiDir, 'openapi-beta.yaml'),
    trimmedFile: path.join(openapiDir, 'openapi-trimmed-beta.yaml'),
    clientFile: path.join(generatedDir, 'client-beta.ts'),
  },
];

const args = process.argv.slice(2);
const forceDownload = args.includes('--force');

async function main() {
  console.log('Microsoft Graph API OpenAPI Processor');
  console.log('------------------------------------');

  try {
    for (const target of targets) {
      console.log(`\n=== Graph ${target.version} ===`);

      console.log(`📥 Step 1: Downloading ${target.version} OpenAPI specification`);
      const downloaded = await downloadGraphOpenAPI(
        openapiDir,
        target.specFile,
        target.url,
        forceDownload
      );
      console.log(downloaded ? '✅ Downloaded' : '⏭️ Download skipped (file exists)');

      console.log('🔧 Step 2: Creating simplified OpenAPI specification');
      createAndSaveSimplifiedOpenAPI(
        endpointsFile,
        target.specFile,
        target.trimmedFile,
        target.version
      );
      console.log('✅ Successfully created simplified OpenAPI specification');

      console.log('🚀 Step 3: Generating client code using openapi-zod-client');
      generateMcpTools(target.trimmedFile, target.clientFile);
      console.log('✅ Successfully generated client code');
    }
  } catch (error) {
    console.error('\n❌ Error processing OpenAPI specification:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
