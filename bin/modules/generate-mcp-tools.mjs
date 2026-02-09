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

    console.log('Decoding HTML entities in path patterns...');
    // openapi-zod-client HTML-encodes special characters in path patterns
    // This breaks Microsoft Graph function-style APIs like range(address='A1:G10')
    clientCode = clientCode.replace(/&#x3D;/g, '='); // Decode = sign
    clientCode = clientCode.replace(/&#x27;/g, "'"); // Decode single quote
    clientCode = clientCode.replace(/&#x28;/g, '('); // Decode left paren
    clientCode = clientCode.replace(/&#x29;/g, ')'); // Decode right paren
    clientCode = clientCode.replace(/&#x3A;/g, ':'); // Decode colon

    console.log('Fixing function-style API paths with template literals...');
    // After HTML decoding, paths like range(address=':address') have nested single quotes
    // which cause TypeScript syntax errors. Convert the path string from single quotes
    // to backticks (template literal) so single quotes can remain inside.
    // Match: path: '/...range(param=':value')...',
    // Replace with: path: `/...range(param=':value')...`,
    clientCode = clientCode.replace(/(path:\s*)'(\/[^']*\([^)]*=':[\w]+'\)[^']*)'/g, '$1`$2`');

    fs.writeFileSync(clientFilePath, clientCode);

    return true;
  } catch (error) {
    throw new Error(`Error generating client code: ${error.message}`);
  }
}
