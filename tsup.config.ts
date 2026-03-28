import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', 'src/endpoints.json'],
  format: ['esm'],
  target: 'es2020',
  outDir: 'dist',
  clean: true,
  bundle: false,
  splitting: false,
  sourcemap: false,
  dts: false,
  publicDir: false,
  onSuccess: process.platform === 'win32' ? undefined : 'chmod +x dist/index.js',
  loader: {
    '.json': 'copy',
  },
  noExternal: [],
  external: [
    '@aws-sdk/client-ssm',
    '@azure/identity',
    '@azure/keyvault-secrets',
    '@azure/msal-node',
    '@modelcontextprotocol/sdk',
    '@vendia/serverless-express',
    'commander',
    'dotenv',
    'express',
    'js-yaml',
    'keytar',
    'winston',
    'zod',
  ],
});
