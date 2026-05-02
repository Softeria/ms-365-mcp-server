import { describe, expect, it } from 'vitest';
import { buildToolsRegistry } from '../src/graph-tools.js';
import { describeToolSchema } from '../src/lib/tool-schema.js';

const registry = buildToolsRegistry(false, true);

function schemaFor(name: string) {
  const entry = registry.get(name);
  if (!entry) throw new Error(`Registry missing ${name}`);
  return describeToolSchema(entry.tool, entry.config?.llmTip);
}

describe('describeToolSchema', () => {
  it('returns name, method, path, and parameters for a common tool', () => {
    const s = schemaFor('list-mail-messages');
    expect(s.name).toBe('list-mail-messages');
    expect(s.method).toBe('GET');
    expect(s.path).toContain('/me/messages');
    expect(Array.isArray(s.parameters)).toBe(true);
  });

  it('marks path parameters as required', () => {
    const s = schemaFor('get-mail-message');
    const pathParams = s.parameters.filter((p) => p.in === 'Path');
    expect(pathParams.length).toBeGreaterThan(0);
    for (const p of pathParams) expect(p.required).toBe(true);
  });

  it('emits JSON Schema objects (not Zod) for every parameter', () => {
    const s = schemaFor('send-mail');
    for (const p of s.parameters) {
      expect(p.schema).toBeDefined();
      expect(typeof p.schema).toBe('object');
      // zod-to-json-schema always produces a typed node at the root for our schemas
      expect(p.schema).toHaveProperty('type');
    }
  });

  it('includes llmTip when the endpoint has one', () => {
    // Walk the registry for any tool with an llmTip — guard against registries without one
    const entry = [...registry.entries()].find(([, v]) => v.config?.llmTip)?.[1];
    if (!entry) return;
    const s = describeToolSchema(entry.tool, entry.config?.llmTip);
    expect(s.llmTip).toBeTruthy();
  });
});
