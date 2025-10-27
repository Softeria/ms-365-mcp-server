#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const endpointsPath = join(__dirname, '..', 'src', 'endpoints.json');
const outputPath = join(__dirname, '..', 'src', 'generated', 'endpoints-data.ts');

const endpointsData = readFileSync(endpointsPath, 'utf8');

const output = `// Auto-generated file - do not edit manually
// Generated from src/endpoints.json for binary compilation
export const endpointsData = ${endpointsData};
`;

writeFileSync(outputPath, output, 'utf8');
console.log('Generated src/generated/endpoints-data.ts');
