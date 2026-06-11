import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/endpoints.json'],
  format: ['esm'],
  target: 'es2020',
  outDir: 'dist',
  clean: true,
  bundle: true,
  splitting: false,
  sourcemap: false,
  dts: false,
  publicDir: false,
  onSuccess: process.platform === 'win32' ? undefined : 'chmod +x dist/index.js',
  loader: {
    '.json': 'copy',
  },
  noExternal: [
    '@azure/msal-node',
    '@modelcontextprotocol/sdk',
    'commander',
    'dotenv',
    'express',
    'js-yaml',
    'winston',
    'zod',
    '@zodios/core',
    '@toon-format/toon'
  ],
  external: [],
});
