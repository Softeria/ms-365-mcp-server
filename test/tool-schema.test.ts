import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildToolsRegistry, registerGraphTools } from '../src/graph-tools.js';
import { describeToolSchema } from '../src/lib/tool-schema.js';
import type { GraphClient } from '../src/graph-client.js';

const registry = buildToolsRegistry(false, true);

function schemaFor(name: string) {
  const entry = registry.get(name);
  if (!entry) throw new Error(`Registry missing ${name}`);
  return describeToolSchema(entry.tool, entry.config);
}

/**
 * Registers every Graph tool the same way the non-discovery path does (real
 * endpoints, real endpoints.json config) and returns each tool's actual
 * registered Zod param schema, keyed by tool name. Used to assert that
 * describeToolSchema (--discovery mode) produces IDENTICAL descriptions to
 * what an agent using normal registration would see — the drift this whole
 * fix exists to prevent.
 */
function registeredParamSchemas(
  multiAccount = false,
  accountNames: string[] = []
): Map<string, Record<string, z.ZodTypeAny>> {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  const graphClient = {} as GraphClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- registerTool() has many overloads
  const registerToolSpy = vi.spyOn(server, 'registerTool').mockImplementation((() => {}) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.spyOn(server, 'tool').mockImplementation((() => {}) as any);

  // orgMode: true matches `registry` above (buildToolsRegistry(false, true)) so both
  // sides see the same set of tools (work-scoped tools included).
  registerGraphTools(
    server,
    graphClient,
    false,
    undefined,
    true,
    undefined,
    multiAccount,
    accountNames
  );

  const map = new Map<string, Record<string, z.ZodTypeAny>>();
  for (const call of registerToolSpy.mock.calls) {
    const name = call[0] as string;
    const inputSchema = (call[1] as { inputSchema: z.AnyZodObject }).inputSchema;
    map.set(name, inputSchema.shape as Record<string, z.ZodTypeAny>);
  }
  registerToolSpy.mockRestore();
  return map;
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
    const s = describeToolSchema(entry.tool, entry.config);
    expect(s.llmTip).toBeTruthy();
  });

  it('exposes the confirm parameter on destructive tools (--discovery support)', () => {
    // Without this, an agent in --discovery mode that calls get-tool-schema on
    // a destructive tool would never see the confirm gate and every execute-tool
    // call would fail with confirmation_required.
    const s = schemaFor('delete-mail-message');
    const confirm = s.parameters.find((p) => p.name === 'confirm');
    expect(confirm).toBeDefined();
    expect(confirm?.required).toBe(false);
    expect(confirm?.schema).toMatchObject({ type: 'boolean' });
    expect(confirm?.description).toMatch(/confirmation_required/);
  });

  it('does NOT expose confirm on read-only tools', () => {
    const s = schemaFor('list-mail-messages');
    expect(s.parameters.find((p) => p.name === 'confirm')).toBeUndefined();
  });

  it('does NOT expose confirm on POST endpoints flagged readOnly (e.g. find-meeting-times)', () => {
    // find-meeting-times is a POST that reads, not writes — endpoints.json
    // marks it readOnly so the destructive classification skips it.
    const entry = registry.get('find-meeting-times');
    if (!entry) return;
    const s = describeToolSchema(entry.tool, entry.config);
    expect(s.parameters.find((p) => p.name === 'confirm')).toBeUndefined();
  });
});

/**
 * Regression coverage for the bug where --discovery mode's get-tool-schema showed
 * the raw, often-useless Microsoft spec text for OData/synthetic parameters while
 * normal registration (registerGraphTools) showed spec-gap-guidance overrides —
 * because the two paths built descriptions independently. Both now pull from
 * lib/param-descriptions.ts, so these assert EXACT equality against what
 * registerGraphTools actually puts in its Zod schema, not just "looks similar" —
 * any future edit to one copy without the other would fail these.
 */
describe('describeToolSchema parity with registerGraphTools (discovery-mode drift guard)', () => {
  const registered = registeredParamSchemas();

  function registeredDescription(toolName: string, paramName: string): string | undefined {
    const shape = registered.get(toolName);
    if (!shape) throw new Error(`registerGraphTools did not register ${toolName}`);
    const schema = shape[paramName];
    if (!schema) return undefined;
    return schema.description;
  }

  it('matches $expand description exactly (the instance Codex originally flagged)', () => {
    const s = schemaFor('list-mail-messages');
    const discovery = s.parameters.find((p) => p.name === 'expand' || p.name === '$expand');
    const expected = registeredDescription('list-mail-messages', 'expand');
    expect(expected).toBeDefined();
    expect(expected).not.toMatch(/Expand related entities/);
    expect(discovery?.description).toBe(expected);
  });

  it('matches $select description exactly', () => {
    const s = schemaFor('list-mail-messages');
    const discovery = s.parameters.find((p) => p.name === 'select' || p.name === '$select');
    const expected = registeredDescription('list-mail-messages', 'select');
    expect(expected).toBeDefined();
    expect(discovery?.description).toBe(expected);
  });

  it('matches $filter, $search, $orderby, $skip, $count descriptions exactly', () => {
    const s = schemaFor('list-mail-messages');
    for (const name of ['filter', 'search', 'orderby', 'skip', 'count']) {
      const discovery = s.parameters.find((p) => p.name === name || p.name === `$${name}`);
      const expected = registeredDescription('list-mail-messages', name);
      expect(expected, `expected registerGraphTools to have a ${name} param`).toBeDefined();
      expect(discovery?.description, `mismatch for ${name}`).toBe(expected);
    }
  });

  it('matches $top description exactly on a tool that supports it', () => {
    const s = schemaFor('list-mail-messages');
    const discovery = s.parameters.find((p) => p.name === 'top' || p.name === '$top');
    const expected = registeredDescription('list-mail-messages', 'top');
    expect(expected).toBeDefined();
    expect(discovery?.description).toBe(expected);
  });

  it('omits $top/top entirely for TOP_UNSUPPORTED_DELTA_TOOLS, matching registration', () => {
    // registerGraphTools does `delete paramSchema['top']` for these tools (Graph's
    // event-delta doesn't support $top); discovery mode must omit it too, not just
    // re-describe it, or an agent would try a parameter that silently does nothing.
    for (const toolName of ['list-calendar-events-delta', 'list-calendar-view-delta']) {
      const entry = registry.get(toolName);
      if (!entry) continue;
      const s = describeToolSchema(entry.tool, entry.config);
      expect(s.parameters.find((p) => p.name === 'top' || p.name === '$top')).toBeUndefined();

      const registeredShape = registered.get(toolName);
      expect(registeredShape).toBeDefined();
      expect(registeredShape).not.toHaveProperty('top');
      expect(registeredShape).not.toHaveProperty('$top');
    }
  });

  it('matches timezone description exactly for a calendar endpoint that supports it', () => {
    const entry = registry.get('get-calendar-view');
    if (!entry) throw new Error('registry missing get-calendar-view');
    const s = describeToolSchema(entry.tool, entry.config);
    const discovery = s.parameters.find((p) => p.name === 'timezone');
    const expected = registeredDescription('get-calendar-view', 'timezone');
    expect(expected).toBeDefined();
    expect(discovery?.description).toBe(expected);
  });

  it('matches expandExtendedProperties description exactly for a calendar endpoint that supports it', () => {
    const entry = registry.get('get-calendar-view');
    if (!entry) throw new Error('registry missing get-calendar-view');
    const s = describeToolSchema(entry.tool, entry.config);
    const discovery = s.parameters.find((p) => p.name === 'expandExtendedProperties');
    const expected = registeredDescription('get-calendar-view', 'expandExtendedProperties');
    expect(expected).toBeDefined();
    expect(discovery?.description).toBe(expected);
  });

  it('matches fetchAllPages description exactly for a GET list endpoint', () => {
    const entry = registry.get('list-mail-messages');
    if (!entry) throw new Error('registry missing list-mail-messages');
    const s = describeToolSchema(entry.tool, entry.config);
    const discovery = s.parameters.find((p) => p.name === 'fetchAllPages');
    const expected = registeredDescription('list-mail-messages', 'fetchAllPages');
    expect(expected).toBeDefined();
    expect(discovery?.description).toBe(expected);
  });

  it('matches confirm description exactly (already shared logic, guarded against future drift)', () => {
    const entry = registry.get('delete-mail-message');
    if (!entry) throw new Error('registry missing delete-mail-message');
    const s = describeToolSchema(entry.tool, entry.config);
    const discovery = s.parameters.find((p) => p.name === 'confirm');
    const expected = registeredDescription('delete-mail-message', 'confirm');
    expect(expected).toBeDefined();
    expect(discovery?.description).toBe(expected);
  });

  it('matches account description exactly in multi-account mode', () => {
    const accountNames = ['user@outlook.com', 'work@company.com'];
    const multiRegistered = registeredParamSchemas(true, accountNames);
    const entry = registry.get('list-mail-messages');
    if (!entry) throw new Error('registry missing list-mail-messages');
    const s = describeToolSchema(entry.tool, entry.config, { multiAccount: true, accountNames });
    const discovery = s.parameters.find((p) => p.name === 'account');
    const registeredSchema = multiRegistered.get('list-mail-messages')?.['account'];
    expect(registeredSchema).toBeDefined();
    expect(discovery?.description).toBe(registeredSchema!.description);
    expect(discovery?.description).toContain('user@outlook.com');
  });

  it('does NOT expose account param when multiAccount is false', () => {
    const entry = registry.get('list-mail-messages');
    if (!entry) throw new Error('registry missing list-mail-messages');
    const s = describeToolSchema(entry.tool, entry.config);
    expect(s.parameters.find((p) => p.name === 'account')).toBeUndefined();
  });
});
