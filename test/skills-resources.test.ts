import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DataType, newDb } from 'pg-mem';
import type { Pool } from 'pg';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { __setPoolForTesting } from '../src/lib/postgres.js';
import { requestContext } from '../src/request-context.js';
import { readMcpResource } from '../src/lib/mcp-resources/read.js';
import { registerMcpResources } from '../src/lib/mcp-resources/register.js';
import {
  DISCOVERY_META_TOOL_NAMES,
  DISCOVERY_PRESET_VERSION,
} from '../src/lib/tenant-surface/surface.js';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

vi.mock('../src/generated/client.js', () => ({
  api: { endpoints: [] },
}));

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
      owner_subject text,
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
      owner_subject text,
      alias text NOT NULL,
      label text,
      note text,
      last_used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW()
    );
    CREATE TABLE tenant_facts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      owner_subject text,
      scope text NOT NULL,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`INSERT INTO tenants (id) VALUES ($1), ($2)`, [TENANT_A, TENANT_B]);
  await pool.query(
    `INSERT INTO tenant_skills (tenant_id, name, title, description, frontmatter, body, arguments)
     VALUES ($1, 'triage', 'Triage', 'Summarize mail', $2::jsonb, 'Handle {{account}}', $3::jsonb),
            ($4, 'other', 'Other', 'Other tenant', '{}'::jsonb, 'Other body', '[]'::jsonb)`,
    [
      TENANT_A,
      JSON.stringify({ tools: ['list-mail-messages'], risk: 'low' }),
      JSON.stringify([{ name: 'account', required: true }]),
      TENANT_B,
    ]
  );
}

function textOf(result: Awaited<ReturnType<typeof readMcpResource>>): string {
  return result.contents[0].text;
}

type RequestHandler = (request: unknown, extra: unknown) => Promise<unknown>;

async function invokeResourcesList(
  server: McpServer
): Promise<{ resources: Array<{ uri: string; mimeType?: string }> }> {
  const handler = (
    server.server as unknown as { _requestHandlers: Map<string, RequestHandler> }
  )._requestHandlers.get('resources/list');
  if (!handler) throw new Error('resources/list missing');
  return handler({ method: 'resources/list', params: {} }, { requestId: 'test' });
}

async function invokeResourceTemplatesList(
  server: McpServer
): Promise<{ resourceTemplates: Array<{ uriTemplate: string; mimeType?: string }> }> {
  const handler = (
    server.server as unknown as { _requestHandlers: Map<string, RequestHandler> }
  )._requestHandlers.get('resources/templates/list');
  if (!handler) throw new Error('resources/templates/list missing');
  return handler({ method: 'resources/templates/list', params: {} }, { requestId: 'test' });
}

describe('Phase 8 Plan 08-06 skill resources', () => {
  let pool: Pool;

  beforeEach(async () => {
    pool = makePool();
    await installSchema(pool);
    __setPoolForTesting(pool);
  });

  afterEach(async () => {
    __setPoolForTesting(null);
    await pool.end();
  });

  it('reads canonical m365 skill index, markdown, schema, and pack resources', async () => {
    await requestContext.run({ tenantId: TENANT_A }, async () => {
      const index = await readMcpResource(`m365://tenant/${TENANT_A}/skills/index.json`, {});
      expect(index.contents[0].mimeType).toBe('application/json');
      expect(JSON.parse(textOf(index))).toMatchObject({ skills: [{ name: 'triage' }] });

      const markdown = await readMcpResource(`m365://tenant/${TENANT_A}/skills/triage.md`, {});
      expect(markdown.contents[0]).toMatchObject({
        uri: `m365://tenant/${TENANT_A}/skills/triage.md`,
        mimeType: 'text/markdown',
      });
      expect(textOf(markdown)).toContain('Handle {{account}}');

      const schema = await readMcpResource(
        `m365://tenant/${TENANT_A}/skills/triage.schema.json`,
        {}
      );
      expect(JSON.parse(textOf(schema))).toMatchObject({
        name: 'triage',
        arguments: [{ name: 'account' }],
      });

      const pack = await readMcpResource(`m365://tenant/${TENANT_A}/skill-packs/default.json`, {});
      expect(JSON.parse(textOf(pack))).toMatchObject({
        packName: 'default',
        skills: [{ name: 'triage' }],
      });
    });
  });

  it('rejects cross-tenant skill reads and invalid decorated URIs before store access', async () => {
    await expect(
      requestContext.run({ tenantId: TENANT_A }, () =>
        readMcpResource(`m365://tenant/${TENANT_B}/skills/other.md`, {})
      )
    ).rejects.toMatchObject({ data: { code: 'tenant_resource_mismatch' } });

    for (const uri of [
      `m365://tenant/${TENANT_A}/skills/../secret.md`,
      `m365://user:pass@tenant/${TENANT_A}/skills/triage.md`,
      `m365://tenant/${TENANT_A}/skills/triage.md?x=1`,
      `m365://tenant/${TENANT_A}/skills/triage.md#frag`,
    ]) {
      await expect(readMcpResource(uri, {})).rejects.toMatchObject({
        data: { code: 'invalid_resource_uri' },
      });
    }
  });

  it('keeps mcp compatibility aliases while canonical response URIs prefer m365', async () => {
    await requestContext.run({ tenantId: TENANT_A }, async () => {
      const result = await readMcpResource(`mcp://tenant/${TENANT_A}/skills/triage.md`, {});
      expect(result.contents[0].uri).toBe(`m365://tenant/${TENANT_A}/skills/triage.md`);
      expect(textOf(result)).toContain('Handle {{account}}');
    });
  });

  it('registers m365 skill resources and templates for discovery tenants only', async () => {
    const discoveryServer = new McpServer({ name: 'resources-test', version: '0.0.0' });
    registerMcpResources(discoveryServer, {
      tenant: {
        id: TENANT_A,
        enabled_tools_set: DISCOVERY_META_TOOL_NAMES,
        enabled_tools: null,
        preset_version: DISCOVERY_PRESET_VERSION,
      },
    });

    const list = await requestContext.run({ tenantId: TENANT_A }, () =>
      invokeResourcesList(discoveryServer)
    );
    expect(list.resources.map((resource) => resource.uri)).toContain(
      `m365://tenant/${TENANT_A}/skills/index.json`
    );

    const templates = await invokeResourceTemplatesList(discoveryServer);
    expect(templates.resourceTemplates.map((template) => template.uriTemplate)).toEqual(
      expect.arrayContaining([
        'm365://tenant/{tenantId}/skills/{name}.md',
        'm365://tenant/{tenantId}/skills/{name}.schema.json',
        'm365://tenant/{tenantId}/skill-packs/{packName}.json',
      ])
    );

    const staticServer = new McpServer({ name: 'resources-test', version: '0.0.0' });
    registerMcpResources(staticServer, {
      tenant: {
        id: TENANT_B,
        enabled_tools_set: new Set(['list-mail-messages']),
        enabled_tools: 'list-mail-messages',
        preset_version: 'essentials-v1',
      },
    });
    const staticUris = (await invokeResourcesList(staticServer)).resources.map(
      (resource) => resource.uri
    );
    expect(staticUris).toContain('m365://catalog/navigation-guide.md');
    expect(staticUris).not.toContain(`m365://tenant/${TENANT_B}/skills/index.json`);

    const staticTemplates = (await invokeResourceTemplatesList(staticServer)).resourceTemplates.map(
      (template) => template.uriTemplate
    );
    expect(staticTemplates).not.toContain('m365://tenant/{tenantId}/skills/{name}.md');
    expect(staticTemplates).not.toContain('m365://tenant/{tenantId}/skills/{name}.schema.json');
    expect(staticTemplates).not.toContain('m365://tenant/{tenantId}/skill-packs/{packName}.json');
  });
});
