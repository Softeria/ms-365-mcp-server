import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DataType, newDb } from 'pg-mem';
import type { Pool } from 'pg';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { __setPoolForTesting } from '../src/lib/postgres.js';
import { requestContext } from '../src/request-context.js';
import { MemoryRedisFacade } from '../src/lib/redis-facade.js';
import { AGENTIC_EVENTS_CHANNEL } from '../src/lib/mcp-notifications/events.js';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'list-mail-messages',
        method: 'get',
        path: '/me/messages',
        description: 'List messages.',
        parameters: [],
      },
      {
        alias: 'send-mail',
        method: 'post',
        path: '/me/sendMail',
        description: 'Send mail.',
        parameters: [],
      },
    ],
  },
}));

interface CallToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
  structuredContent?: unknown;
}

function makePool(): Pool {
  const db = newDb();
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    impure: true,
    implementation: () => crypto.randomUUID(),
  });
  const { Pool: PgMemPool } = db.adapters.createPg();
  return new PgMemPool() as Pool;
}

async function installSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE tenants (id uuid PRIMARY KEY);
    CREATE TABLE tenant_skills (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      owner_subject text,
      name text NOT NULL,
      title text NOT NULL,
      description text NOT NULL,
      frontmatter jsonb NOT NULL DEFAULT '{}'::jsonb,
      body text NOT NULL,
      arguments jsonb NOT NULL DEFAULT '[]'::jsonb,
      visibility text NOT NULL DEFAULT 'tenant',
      source text NOT NULL DEFAULT 'custom',
      source_skill_name text,
      version integer NOT NULL DEFAULT 1,
      enabled boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );
    CREATE TABLE tenant_tool_recipes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name text NOT NULL,
      alias text NOT NULL,
      params jsonb NOT NULL DEFAULT '{}'::jsonb,
      note text,
      last_run_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW()
    );
    CREATE TABLE tenant_tool_bookmarks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      alias text NOT NULL,
      label text,
      note text,
      last_used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW()
    );
    CREATE TABLE tenant_facts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      scope text NOT NULL,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`INSERT INTO tenants (id) VALUES ($1), ($2)`, [TENANT_A, TENANT_B]);
}

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const registered = (
    server as unknown as {
      _registeredTools: Record<
        string,
        { handler: (args: unknown, extra: unknown) => Promise<CallToolResult> }
      >;
    }
  )._registeredTools;
  const tool = registered[name];
  if (!tool?.handler) throw new Error(`tool ${name} not registered`);
  return tool.handler(args, { requestId: 'test' });
}

function bodyOf(result: CallToolResult): Record<string, unknown> {
  return JSON.parse(result.content[0].text) as Record<string, unknown>;
}

async function collectEvents(redis: MemoryRedisFacade, fn: () => Promise<void>) {
  const events: Array<{ type: string; tenantId: string; uris?: string[] }> = [];
  redis.on('message', (channel, message) => {
    if (channel === AGENTIC_EVENTS_CHANNEL) {
      events.push(JSON.parse(message) as { type: string; tenantId: string; uris?: string[] });
    }
  });
  await redis.subscribe(AGENTIC_EVENTS_CHANNEL);
  await fn();
  return events;
}

describe('Phase 8 Plan 08-06 skill tools', () => {
  let pool: Pool;
  let server: McpServer;
  let redis: MemoryRedisFacade;

  beforeEach(async () => {
    vi.resetModules();
    pool = makePool();
    await installSchema(pool);
    __setPoolForTesting(pool);
    server = new McpServer({ name: 'skills-test', version: '0.0.0' });
    redis = new MemoryRedisFacade();
  });

  afterEach(async () => {
    __setPoolForTesting(null);
    await pool.end();
  });

  it('forks a built-in, saves edits, renders, lists, and disables without crossing tenants', async () => {
    const { registerSkillTools } = await import('../src/lib/mcp-skills/tools.js');
    registerSkillTools(server, {
      redis,
      loadBuiltInPrompts: () => [
        {
          sourcePath: 'builtin:triage',
          name: 'triage',
          description: 'Built-in triage',
          arguments: [{ name: 'account', required: true }],
          template: 'Triage {{account}}',
        },
      ],
    });

    const events = await collectEvents(redis, async () => {
      await requestContext.run(
        { tenantId: TENANT_A, enabledToolsSet: new Set(['list-mail-messages']) },
        async () => {
          const forked = await callTool(server, 'fork-builtin-skill', { name: 'triage' });
          expect(forked.isError).toBeFalsy();

          const saved = await callTool(server, 'save-skill', {
            name: 'triage',
            title: 'Tenant triage',
            description: 'Edited triage',
            body: 'Edited {{account}}',
            arguments: [{ name: 'account', required: true }],
            frontmatter: { tools: ['list-mail-messages'], risk: 'low' },
            visibility: 'tenant',
            published: true,
          });
          expect(saved.isError).toBeFalsy();

          const rendered = await callTool(server, 'render-skill', {
            name: 'triage',
            args: { account: '<inbox>' },
          });
          expect(bodyOf(rendered)).toMatchObject({ text: 'Edited &lt;inbox&gt;' });

          const listed = await callTool(server, 'list-skills', {});
          expect(
            (bodyOf(listed).skills as Array<{ name: string }>).map((skill) => skill.name)
          ).toContain('triage');

          const deleted = await callTool(server, 'delete-skill', { name: 'triage' });
          expect(bodyOf(deleted)).toMatchObject({ deleted: true });
          const afterDelete = await callTool(server, 'list-skills', {});
          expect(
            (bodyOf(afterDelete).skills as Array<{ name: string }>).map((skill) => skill.name)
          ).not.toContain('triage');
        }
      );
    });

    await requestContext.run(
      { tenantId: TENANT_B, enabledToolsSet: new Set(['list-mail-messages']) },
      async () => {
        const tenantBList = await callTool(server, 'list-skills', {});
        expect(
          (bodyOf(tenantBList).skills as Array<{ name: string }>).map((skill) => skill.name)
        ).toContain('triage');
        expect((bodyOf(tenantBList).skills as Array<{ source: string }>)[0].source).toBe('builtin');
      }
    );

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'prompts/list_changed', tenantId: TENANT_A }),
        expect.objectContaining({
          type: 'resources/updated',
          tenantId: TENANT_A,
          uris: expect.arrayContaining([`m365://tenant/${TENANT_A}/skills/index.json`]),
        }),
      ])
    );
  });

  it('blocks published invalid references while allowing draft saves with warnings', async () => {
    const { registerSkillTools } = await import('../src/lib/mcp-skills/tools.js');
    registerSkillTools(server, { redis, loadBuiltInPrompts: () => [] });

    await requestContext.run(
      { tenantId: TENANT_A, enabledToolsSet: new Set(['list-mail-messages']) },
      async () => {
        const published = await callTool(server, 'save-skill', {
          name: 'bad_refs',
          title: 'Bad refs',
          description: 'References a disabled tool',
          body: 'Use disabled tool',
          frontmatter: { tools: ['send-mail'] },
          published: true,
        });
        expect(published.isError).toBe(true);
        expect(bodyOf(published)).toMatchObject({ error: 'skill_validation_failed' });

        const draft = await callTool(server, 'save-skill', {
          name: 'bad_refs',
          title: 'Bad refs',
          description: 'Draft can carry warnings',
          body: 'Use disabled tool',
          frontmatter: { tools: ['send-mail'] },
          published: false,
        });
        expect(draft.isError).toBeFalsy();
        expect((bodyOf(draft).validation as { ok: boolean; warnings: unknown[] }).ok).toBe(false);
      }
    );
  });

  it('returns confirmation-required validation for high-risk tool metadata', async () => {
    const { registerSkillTools } = await import('../src/lib/mcp-skills/tools.js');
    registerSkillTools(server, { redis, loadBuiltInPrompts: () => [] });

    await requestContext.run(
      { tenantId: TENANT_A, enabledToolsSet: new Set(['send-mail']) },
      async () => {
        const result = await callTool(server, 'validate-skill', {
          skill: {
            name: 'send_status',
            title: 'Send status',
            description: 'Prepare a send-mail workflow',
            body: 'Send a status email',
            frontmatter: { tools: ['send-mail'] },
          },
        });
        expect(result.isError).toBeFalsy();
        expect(bodyOf(result)).toMatchObject({
          validation: {
            confirmationRequired: true,
            highRiskTools: ['send-mail'],
          },
        });
      }
    );
  });
});
