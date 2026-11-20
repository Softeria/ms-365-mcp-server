import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';
import type { ZodTypeAny } from 'zod';
import type { GraphClient } from '../src/graph-client.js';
import { registerGraphTools } from '../src/graph-tools.js';
import { serveToolInputSchema } from '../src/lib/body-schema-budget.js';

const { api } = await import('../src/generated/client.js');

// create-chat declares its own body in endpoints.json: Graph publishes the whole chat
// entity, which Gemini on Vertex AI refuses to take as a tool schema (#757).

function bodySchema(): ZodTypeAny {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const endpoint = (api as any).endpoints.find((e: any) => e.alias === 'create-chat');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return endpoint.parameters.find((p: any) => p.name === 'body').schema;
}

function servedInputSchema(): Record<string, unknown> {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- registerTool() has many overloads
  const spy = vi.spyOn(server, 'registerTool').mockImplementation((() => {}) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.spyOn(server, 'tool').mockImplementation((() => {}) as any);
  registerGraphTools(server, {} as GraphClient, { orgMode: true });
  const call = spy.mock.calls.find((c) => c[0] === 'create-chat');
  if (!call) throw new Error('create-chat was not registered');
  const shape = (call[1] as { inputSchema: { shape: Record<string, ZodTypeAny> } }).inputSchema
    .shape;
  return serveToolInputSchema(shape);
}

const member = (id: string, role = 'owner', extra: Record<string, unknown> = {}) => ({
  '@odata.type': '#microsoft.graph.aadUserConversationMember',
  roles: [role],
  'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${id}')`,
  ...extra,
});

describe('create-chat body', () => {
  it('is served small and flat', () => {
    const text = JSON.stringify(servedInputSchema());
    expect(text).not.toContain('$defs');
    expect(text).not.toContain('$ref');
    expect(text.length).toBeLessThan(4096);
  });

  it('still tells the model how to build a chat', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (servedInputSchema() as any).properties.body;
    expect(body.required).toEqual(['chatType', 'members']);
    expect(body.properties.chatType.enum).toEqual(['oneOnOne', 'group']);
    const members = body.properties.members;
    // The generator strips @odata.type keys, so the description is the only place it is named
    expect(members.description).toContain('#microsoft.graph.aadUserConversationMember');
    expect(members.items.required).toEqual(['roles', 'user@odata.bind']);
    expect(members.items.properties.roles.items.enum).toEqual(['owner', 'guest']);
    expect(Object.keys(members.items.properties)).toContain('tenantId');
    expect(Object.keys(body.properties.installedApps.items.properties)).toEqual([
      'teamsApp@odata.bind',
    ]);
  });

  it.each([
    ['a one-on-one chat', { chatType: 'oneOnOne', members: [member('a'), member('b')] }],
    [
      'a group chat with a guest',
      {
        chatType: 'group',
        topic: 'Group chat title',
        members: [member('a'), member('b'), member('c', 'guest')],
      },
    ],
    [
      'a federated member',
      {
        chatType: 'oneOnOne',
        members: [member('a'), member('b', 'owner', { tenantId: 'other-tenant' })],
      },
    ],
    [
      'installed apps',
      {
        chatType: 'oneOnOne',
        members: [member('a'), member('b')],
        installedApps: [
          {
            'teamsApp@odata.bind': 'https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/APP',
          },
        ],
      },
    ],
  ])('accepts the documented example for %s', (_name, body) => {
    const result = bodySchema().safeParse(body);
    expect(result.success).toBe(true);
    // Fields the schema does not name, @odata.type among them, still reach Graph
    expect(result.data).toEqual(body);
  });

  it.each([
    ['an unknown chatType', { chatType: 'meeting', members: [member('a'), member('b')] }],
    ['no members', { chatType: 'oneOnOne' }],
    ['a member without a user', { chatType: 'oneOnOne', members: [{ roles: ['owner'] }] }],
    ['an unknown role', { chatType: 'oneOnOne', members: [member('a', 'member')] }],
  ])('refuses %s', (_name, body) => {
    expect(bodySchema().safeParse(body).success).toBe(false);
  });
});
