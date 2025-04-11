#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const args = process.argv.slice(2);
const forceDownload = args.includes('--force');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.resolve(__dirname, '..', 'openapi');
const targetFile = path.join(targetDir, 'openapi.yaml');

const openapiUrl =
  'https://raw.githubusercontent.com/microsoftgraph/msgraph-metadata/refs/heads/master/openapi/v1.0/openapi.yaml';

async function downloadOpenApi() {
  if (!fs.existsSync(targetDir)) {
    console.log(`Creating directory: ${targetDir}`);
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (fs.existsSync(targetFile) && !forceDownload) {
    console.log(`OpenAPI specification already exists at ${targetFile}`);
    console.log('Use --force to download again');
    return;
  }

  console.log(`Downloading OpenAPI specification from ${openapiUrl}`);

  try {
    const response = await fetch(openapiUrl);

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    fs.writeFileSync(targetFile, content);
    console.log(`OpenAPI specification downloaded to ${targetFile}`);
  } catch (error) {
    console.error('Error downloading OpenAPI specification:', error.message);
    process.exit(1);
  }
}

downloadOpenApi();
