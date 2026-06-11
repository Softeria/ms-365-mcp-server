import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In local dev/stdio, package.json is in '..' relative to 'src/version.ts'.
// In tsup/dist, package.json is also in '..' relative to 'dist/version.js'.
// In Vercel serverless (node_modules + sources), we find it relative to here.
const packageJsonPath = path.join(__dirname, '..', 'package.json');

let versionString = '0.0.0';

try {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  versionString = packageJson.version;
} catch (error) {
  // If reading fails (e.g. in some serverless environments), we use the fallback.
}

export const version: string = versionString;
