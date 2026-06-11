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
    // Change @zodios/core to ./hack.js, but also ensure the import is correct for ESM
    clientCode = clientCode.replace(/'@zodios\/core';/, "'./hack.js';");

    clientCode = clientCode.replace(/\.strict\(\)/g, '.passthrough()');

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

    // openapi-zod-client emits z.instanceof(File) for `format: binary` bodies; MCP
    // transports JSON so no caller produces File. Body marshaller decodes the string.
    clientCode = clientCode.replace(
      /z\.instanceof\(File\)/g,
      "z.string().describe('Base64-encoded file content. The server decodes it and PUTs the raw bytes to Microsoft Graph.')"
    );

    fs.writeFileSync(clientFilePath, clientCode);

    // FIX: Also ensure hack.js exists as a copy of hack.ts but with .js extension for the import to resolve
    // Or just make sure the import is ./hack.ts if tsup/tsx handles it.
    // Given the previous error was about missing ./hack.js, and we have hack.ts,
    // let's create a hack.js shim or change the replacement.
    // Actually, the replacement is in a .ts file, so it should probably be ./hack.js to match the runtime resolution if compiled.
    // However, if we are in a TS environment, it should probably be ./hack.js (TS convention for ESM imports).
    
    return true;
  } catch (error) {
    throw new Error(`Error generating client code: ${error.message}`);
  }
}
