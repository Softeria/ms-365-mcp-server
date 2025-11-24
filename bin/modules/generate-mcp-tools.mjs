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
      `npx -y openapi-zod-client "${openapiTrimmedFile}" -o "${clientFilePath}" --with-description --strict-objects --additional-props-default-value=false`,
      {
        stdio: 'inherit',
      }
    );

    console.log(`Generated client code at: ${clientFilePath}`);

    let clientCode = fs.readFileSync(clientFilePath, 'utf-8');
    clientCode = clientCode.replace(/'@zodios\/core';/, "'./hack.js';");

    clientCode = clientCode.replace(
      /const microsoft_graph_attachment = z\s+\.object\({[\s\S]*?}\)\s+\.strict\(\);/,
      (match) => match.replace(/\.strict\(\);/, '.passthrough();')
    );

    console.log('Stripping unused errors arrays from endpoint definitions...');
    // I didn't make up this crazy regex myself; you know who did. It seems works though.
    clientCode = clientCode.replace(/,?\s*errors:\s*\[[\s\S]*?],?(?=\s*})/g, '');

    fs.writeFileSync(clientFilePath, clientCode);

    return true;
  } catch (error) {
    throw new Error(`Error generating client code: ${error.message}`);
  }
}
