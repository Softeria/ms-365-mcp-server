import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

const SDK_V1 = {
  group: ['@modelcontextprotocol/sdk', '@modelcontextprotocol/sdk/*'],
  message: 'SDK v1 is gone, use the v2 packages.',
};
const CLIENT = {
  group: ['@modelcontextprotocol/client', '@modelcontextprotocol/client/*'],
  message: 'The client package is a devDependency, for tests only.',
};

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.vitest,
        ...globals.jest,
        fs: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
      'no-restricted-imports': ['error', { patterns: [SDK_V1] }],
    },
  },
  {
    // The client package is a devDependency, for tests only
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [SDK_V1, CLIENT] }],
    },
  },
  {
    // MCP Apps views: classic scripts the server inlines into pages in the host's iframe
    files: ['src/apps/**/*.js'],
    languageOptions: {
      parserOptions: { sourceType: 'script' },
      globals: globals.browser,
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'bin/**',
      'src/generated/**',
      '.venv/**',
    ],
  },
];
