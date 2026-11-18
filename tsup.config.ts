import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', 'src/endpoints.json', 'src/apps/*.html', 'src/apps/*.js'],
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
    '.html': 'copy',
    // Only the MCP Apps view scripts: the server inlines them into their pages as they are
    '.js': 'copy',
  },
  noExternal: [],
  external: [
    '@azure/msal-node',
    '@modelcontextprotocol/sdk',
    'commander',
    'dotenv',
    'express',
    'js-yaml',
    'keytar',
    'winston',
    'zod',
  ],
});
