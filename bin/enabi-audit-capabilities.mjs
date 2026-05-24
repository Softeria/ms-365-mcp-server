#!/usr/bin/env node
/**
 * Capability audit — compares the registered tools and requested OAuth scopes
 * against docs/CAPABILITY_BASELINE.json. Exits non-zero on any divergence.
 *
 * Run by CI on every PR. The intent: any change to the exposed tool surface
 * or scope set MUST come with an explicit baseline update in the same PR,
 * forcing a human review of every capability change.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');

const endpoints = JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'endpoints.json'), 'utf8'));
const baseline = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'docs', 'CAPABILITY_BASELINE.json'), 'utf8')
);

const allowlistSrc = fs.readFileSync(path.join(rootDir, 'src', 'enabi-allowlist.ts'), 'utf8');
const allowlistTools = [...allowlistSrc.matchAll(/'([a-z][a-z0-9-]+)'/gi)]
  .map((m) => m[1])
  .filter((t) => /^[a-z]+(-[a-z0-9]+)+$/.test(t) || ['login', 'logout'].includes(t));

const endpointTools = new Set(endpoints.map((ep) => ep.toolName));
const authTools = ['login', 'logout', 'verify-login', 'list-accounts', 'select-account', 'remove-account'];
const registeredTools = new Set([...endpointTools, ...authTools]);

const HIERARCHY = {
  'Mail.ReadWrite': ['Mail.Read'],
  'Calendars.ReadWrite': ['Calendars.Read'],
  'Contacts.ReadWrite': ['Contacts.Read'],
  'MailboxSettings.ReadWrite': ['MailboxSettings.Read'],
  'Mail.ReadWrite.Shared': ['Mail.Read.Shared'],
};
const requestedScopes = new Set();
for (const ep of endpoints) {
  for (const s of ep.scopes || []) requestedScopes.add(s);
}
for (const [higher, lowers] of Object.entries(HIERARCHY)) {
  if (requestedScopes.has(higher) && lowers.every((l) => requestedScopes.has(l))) {
    for (const l of lowers) requestedScopes.delete(l);
  }
}
requestedScopes.add('offline_access');

const baselineTools = new Set(baseline.tools);
const baselineScopes = new Set(baseline.scopes);

const addedTools = [...registeredTools].filter((t) => !baselineTools.has(t)).sort();
const removedTools = [...baselineTools].filter((t) => !registeredTools.has(t)).sort();
const addedScopes = [...requestedScopes].filter((s) => !baselineScopes.has(s)).sort();
const removedScopes = [...baselineScopes].filter((s) => !requestedScopes.has(s)).sort();

const allowlistMissing = [...registeredTools].filter((t) => !allowlistSrc.includes(`'${t}'`)).sort();
const allowlistExtra = [...new Set(allowlistTools)]
  .filter((t) => !registeredTools.has(t))
  .sort();

let failed = false;
function fail(label, items) {
  if (items.length === 0) return;
  failed = true;
  console.error(`\n❌ ${label}:`);
  for (const item of items) console.error(`   - ${item}`);
}
fail('Tools added without baseline update', addedTools);
fail('Tools removed without baseline update', removedTools);
fail('Scopes added without baseline update', addedScopes);
fail('Scopes removed without baseline update', removedScopes);
fail('Tools registered but missing from src/enabi-allowlist.ts', allowlistMissing);
fail('Tools in src/enabi-allowlist.ts but not registered', allowlistExtra);

if (failed) {
  console.error(
    '\nIf this change is intentional, update docs/CAPABILITY_BASELINE.json and src/enabi-allowlist.ts in the same PR and justify the change in the PR description.\n'
  );
  process.exit(1);
}

console.log(`✓ Capability audit passed: ${registeredTools.size} tools, ${requestedScopes.size} scopes match baseline.`);
