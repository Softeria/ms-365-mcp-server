import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export function generateMcpTools(openApiSpec, outputDir) {
  try {
    console.log('Generating client code from OpenAPI spec using openapi-zod-client...');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created directory: ${outputDir}`);
    }

    const rootDir = path.resolve(outputDir, '../..');
    const openapiDir = path.join(rootDir, 'openapi');
    const openapiTrimmedFile = path.join(openapiDir, 'openapi-trimmed.yaml');

    const clientFilePath = path.join(outputDir, 'client.ts');
    execSync(
      `npx -y openapi-zod-client "\${openapiTrimmedFile}" -o "\${clientFilePath}" --with-description --strict-objects --additional-props-default-value=false`,
      {
        stdio: 'inherit',
      }
    );

    console.log(`Generated client code at: \${clientFilePath}`);

    let clientCode = fs.readFileSync(clientFilePath, 'utf-8');
    // Change @zodios/core to ./hack.js to satisfy NodeNext ESM import resolution
    clientCode = clientCode.replace(/'@zodios\\/core';/, "'./hack.js';");

    clientCode = clientCode.replace(/\\.strict\\(\\)/g, '.passthrough()');

    console.log('Stripping unused errors arrays from endpoint definitions...');
    clientCode = clientCode.replace(/,?(\\s*errors:\\s*\\[[\\s\\S]*?],?)(?=\\s*})/g, '');

    console.log('Decoding HTML entities in path patterns...');
    clientCode = clientCode.replace(/&#x3D;/g, '=');
    clientCode = clientCode.replace(/&#x27;/g, "'");
    clientCode = clientCode.replace(/&#x28;/g, '(');
    clientCode = clientCode.replace(/&#x29;/g, ')');
    clientCode = clientCode.replace(/&#x3A;/g, ':');

    console.log('Fixing function-style API paths with template literals...');
    clientCode = clientCode.replace(/(path:\\s*)'(\\/[^']*\\([^)]*=':[\\w]+'\\)[^']*)'/g, '$1`$2`');

    clientCode = clientCode.replace(
      /z\\.instanceof\\(File\\)/g,
      "z.string().describe('Base64-encoded file content. The server decodes it and PUTs the raw bytes to Microsoft Graph.')"
    );

    fs.writeFileSync(clientFilePath, clientCode);

    return true;
  } catch (error) {
    throw new Error(`Error generating client code: \${error.message}`);
  }
}
