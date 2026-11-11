import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { GraphClient } from '../src/graph-client.js';
import { buildToolsRegistry, registerGraphTools } from '../src/graph-tools.js';
import { describeToolSchema } from '../src/lib/tool-schema.js';

// Replacing a OneNote table, paragraph or list needs its generated id, which Graph only
// returns for ?includeIDs=true (#826). The param comes from extraQueryParams in
// endpoints.json, so this runs against the real generated client.
const TOOLS: Record<string, Record<string, unknown>> = {
  'get-onenote-page-content': { onenotePageId: 'p1' },
  'get-sharepoint-site-onenote-page-content': { siteId: 's1', onenotePageId: 'p1' },
};

function setup() {
  const server = new McpServer({ name: 't', version: '1' });
  const calls: Array<[string, { rawResponse?: boolean }]> = [];
  const graphClient = {
    graphRequest: vi.fn(async (path: string, options: { rawResponse?: boolean }) => {
      calls.push([path, options]);
      return { content: [{ type: 'text', text: '<html></html>' }] };
    }),
  } as unknown as GraphClient;
  const handlers = new Map<string, (p: Record<string, unknown>) => Promise<unknown>>();
  const shapes = new Map<string, Record<string, z.ZodTypeAny>>();
  vi.spyOn(server, 'registerTool').mockImplementation(((
    name: string,
    cfg: { inputSchema: z.AnyZodObject },
    h: never
  ) => {
    handlers.set(name, h);
    shapes.set(name, cfg.inputSchema.shape as Record<string, z.ZodTypeAny>);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- registerTool() has many overloads
  }) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.spyOn(server, 'tool').mockImplementation((() => {}) as any);
  registerGraphTools(server, graphClient, { orgMode: true });
  return { handlers, shapes, calls };
}

describe('includeIDs on OneNote page content', () => {
  for (const [toolName, args] of Object.entries(TOOLS)) {
    it(`${toolName} takes includeIDs as an optional boolean`, () => {
      const { shapes } = setup();
      const schema = shapes.get(toolName)?.includeIDs;
      expect(schema, `${toolName} has no includeIDs`).toBeDefined();
      expect(schema!.safeParse(undefined).success).toBe(true);
      expect(schema!.safeParse(true).success).toBe(true);
      expect(schema!.safeParse('yes').success).toBe(false);
      // What the client gets: the description sits on the inner boolean, not the optional
      const json = z.toJSONSchema(z.object({ includeIDs: schema! })) as {
        properties: Record<string, { type?: string; description?: string }>;
      };
      expect(json.properties.includeIDs.type).toBe('boolean');
      expect(json.properties.includeIDs.description).toContain('generated id');
    });

    it(`${toolName} sends includeIDs only when given, and still reads the page raw`, async () => {
      const { handlers, calls } = setup();
      const handler = handlers.get(toolName)!;
      await handler({ ...args, includeIDs: true });
      await handler({ ...args, includeIDs: false });
      await handler(args);
      expect(calls.map(([path]) => path.split('/content')[1])).toEqual([
        '?includeIDs=true',
        '?includeIDs=false',
        '',
      ]);
      // The query string must not take the page off the verbatim /content path (#546)
      for (const [, options] of calls) expect(options.rawResponse).toBe(true);
    });

    it(`${toolName} shows includeIDs in discovery mode`, () => {
      const entry = buildToolsRegistry(false, true).get(toolName)!;
      const param = describeToolSchema(entry.tool, entry.config).parameters.find(
        (p) => p.name === 'includeIDs'
      );
      expect(param).toMatchObject({ in: 'Query', required: false, schema: { type: 'boolean' } });
      expect(param?.description).toContain('generated id');
    });
  }
});
