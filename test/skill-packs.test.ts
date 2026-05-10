import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DataType, newDb } from 'pg-mem';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __setPoolForTesting } from '../src/lib/postgres.js';
import { requestContext } from '../src/request-context.js';
import { MemoryRedisFacade } from '../src/lib/redis-facade.js';

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
    ],
  },
}));

interface CallToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
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

function assertContiguousPgPlaceholders(query: unknown, values: unknown): void {
  if (typeof query !== 'string' || !Array.isArray(values)) return;
  const indexes = [...query.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]));
  if (indexes.length === 0) return;
  const used = new Set(indexes);
  for (let index = 1; index <= Math.max(...indexes); index += 1) {
    expect(used.has(index), `SQL parameter $${index} must be referenced`).toBe(true);
  }
}

function guardPoolQueryPlaceholders(pool: Pool): Pool {
  return {
    ...pool,
    query: ((query: unknown, values?: unknown) => {
      assertContiguousPgPlaceholders(query, values);
      return pool.query(query as string, values as unknown[] | undefined);
    }) as Pool['query'],
  } as Pool;
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
    CREATE UNIQUE INDEX tenant_skills_owner_name ON tenant_skills (tenant_id, COALESCE(owner_subject, ''), name);
    CREATE TABLE tenant_tool_recipes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      owner_subject text,
      name text NOT NULL,
      alias text NOT NULL,
      params jsonb NOT NULL DEFAULT '{}'::jsonb,
      note text,
      last_run_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, name)
    );
    CREATE TABLE tenant_tool_bookmarks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      owner_subject text,
      alias text NOT NULL,
      label text,
      note text,
      last_used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, alias)
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

function pack(body = 'Triage unread mail'): Record<string, unknown> {
  return {
    manifest: {
      id: 'triage-pack',
      name: 'Triage pack',
      version: 1,
      skills: ['triage-mail'],
      recipes: ['triage-unread'],
      bookmarks: ['mail.inbox'],
      facts: ['mail-triage'],
      signature: { alg: 'reserved' },
      checksum: 'reserved-checksum',
    },
    skills: [
      {
        name: 'triage-mail',
        title: 'Triage mail',
        description: 'Triage unread mail.',
        body,
        arguments: [],
        frontmatter: {
          tools: ['list-mail-messages'],
          recipes: ['triage-unread'],
          bookmarks: ['mail.inbox'],
          facts: ['mail-triage'],
          risk: 'low',
        },
      },
    ],
    recipes: [
      {
        name: 'triage-unread',
        alias: 'list-mail-messages',
        params: { top: 10 },
        note: 'Unread mail query.',
      },
    ],
    bookmarks: [
      {
        alias: 'list-mail-messages',
        label: 'mail.inbox',
        note: 'Inbox list entrypoint.',
      },
    ],
    facts: [{ scope: 'mail-triage', content: 'Do not send mail without confirmation.' }],
  };
}

describe('Phase 8 Plan 08-07 skill packs', () => {
  let pool: Pool;

  beforeEach(async () => {
    pool = makePool();
    await installSchema(pool);
    __setPoolForTesting(guardPoolQueryPlaceholders(pool));
  });

  afterEach(async () => {
    __setPoolForTesting(null);
    await pool.end();
  });

  it('imports and exports skills, recipes, bookmarks, and facts through the tool fallback', async () => {
    const { registerSkillTools } = await import('../src/lib/mcp-skills/tools.js');
    const server = new McpServer({ name: 'skill-packs-test', version: '0.0.0' });
    registerSkillTools(server, { redis: new MemoryRedisFacade(), loadBuiltInPrompts: () => [] });

    await requestContext.run(
      { tenantId: TENANT_A, enabledToolsSet: new Set(['list-mail-messages']) },
      async () => {
        const imported = await callTool(server, 'import-skill-pack', { pack: pack() });
        expect(imported.isError).toBeFalsy();
        expect(bodyOf(imported)).toMatchObject({
          packName: 'triage-pack',
          imported: { skills: 1, recipes: 1, bookmarks: 1, facts: 1 },
          trust: { signaturePresent: true, checksumPresent: true, trusted: false },
        });
        expect(bodyOf(imported).warnings).toEqual(
          expect.arrayContaining([
            expect.stringContaining('signature metadata is reserved'),
            expect.stringContaining('checksum metadata is reserved'),
          ])
        );

        const exported = await callTool(server, 'export-skill-pack', {
          names: ['triage-mail'],
          packName: 'roundtrip-pack',
        });
        const exportedPack = bodyOf(exported).pack as Record<string, unknown>;
        expect(exportedPack).toMatchObject({
          packName: 'roundtrip-pack',
          manifest: {
            skills: ['triage-mail'],
            recipes: ['triage-unread'],
            bookmarks: ['mail.inbox'],
            facts: ['mail-triage'],
          },
          trust: { trusted: false },
        });
        expect((exportedPack.skills as Array<{ body: string }>)[0].body).toBe('Triage unread mail');
        expect((exportedPack.recipes as Array<{ name: string }>)[0].name).toBe('triage-unread');
        expect((exportedPack.bookmarks as Array<{ label: string }>)[0].label).toBe('mail.inbox');
        expect((exportedPack.facts as Array<{ scope: string }>)[0].scope).toBe('mail-triage');
      }
    );
  });

  it('defaults conflicts to skip, supports explicit strategies, and blocks built-in overwrites', async () => {
    const { getTenantSkillRecord } = await import('../src/lib/mcp-skills/store.js');
    const { importSkillPack } = await import('../src/lib/mcp-skills/packs.js');

    await importSkillPack(TENANT_A, pack());

    const skipped = await importSkillPack(TENANT_A, pack('Changed body'));
    expect(skipped).toMatchObject({
      imported: { skills: 0 },
      skipped: { skills: ['triage-mail'] },
    });
    expect((await getTenantSkillRecord(TENANT_A, 'triage-mail'))?.body).toBe('Triage unread mail');

    const overwritten = await importSkillPack(TENANT_A, pack('Changed body'), {
      conflictStrategy: 'overwrite-custom-only',
    });
    expect(overwritten.imported.skills).toBe(1);
    expect((await getTenantSkillRecord(TENANT_A, 'triage-mail'))?.body).toBe('Changed body');

    const forked = await importSkillPack(TENANT_A, pack('Fork body'), { conflictStrategy: 'fork' });
    expect(forked.renamed).toEqual([{ from: 'triage-mail', to: 'triage-mail-fork' }]);
    expect((await getTenantSkillRecord(TENANT_A, 'triage-mail-fork'))?.body).toBe('Fork body');

    const protectedPack = {
      ...pack(),
      skills: [
        {
          name: 'builtin-skill',
          title: 'Built in',
          description: 'Protected built-in.',
          body: 'Cannot overwrite.',
          arguments: [],
          frontmatter: {},
        },
      ],
    };
    const protectedResult = await importSkillPack(TENANT_A, protectedPack, {
      conflictStrategy: 'overwrite-custom-only',
      builtInSkillNames: new Set(['builtin-skill']),
    });
    expect(protectedResult).toMatchObject({
      imported: { skills: 0 },
      skipped: { skills: ['builtin-skill'] },
    });
    expect(await getTenantSkillRecord(TENANT_A, 'builtin-skill')).toBeNull();
  });

  it('imports and exports skill packs through local-only file roots', async () => {
    const { writeSkillPackToRoot } = await import('../src/lib/mcp-skills/roots.js');
    const { registerSkillTools } = await import('../src/lib/mcp-skills/tools.js');
    const root = await mkdtemp(path.join(tmpdir(), 'm365-skill-pack-root-'));
    const rootUri = pathToFileURL(`${root}/`).toString();
    const server = new McpServer({ name: 'skill-packs-test', version: '0.0.0' });
    registerSkillTools(server, { redis: new MemoryRedisFacade(), loadBuiltInPrompts: () => [] });

    try {
      await writeSkillPackToRoot({ rootUri, path: 'packs/input.json' }, pack('Root pack body'));

      await requestContext.run(
        { tenantId: TENANT_A, enabledToolsSet: new Set(['list-mail-messages']) },
        async () => {
          const imported = await callTool(server, 'import-skill-pack', {
            rootFile: { rootUri, path: 'packs/input.json' },
          });
          expect(imported.isError).toBeFalsy();
          expect(bodyOf(imported)).toMatchObject({ imported: { skills: 1 } });

          const exported = await callTool(server, 'export-skill-pack', {
            names: ['triage-mail'],
            packName: 'root-export',
            rootFile: { rootUri, path: 'exports/roundtrip.json' },
          });
          expect(bodyOf(exported).rootWrite).toMatchObject({
            rootUri,
            path: 'exports/roundtrip.json',
          });
          const written = JSON.parse(
            await readFile(path.join(root, 'exports/roundtrip.json'), 'utf8')
          ) as Record<string, unknown>;
          expect(written).toMatchObject({ packName: 'root-export' });
        }
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('declares stable built-in pack ids and imports built-in packs only when explicit', async () => {
    const { BUILTIN_SKILL_PACK_IDS } = await import('../src/lib/mcp-skills/builtin-packs.js');
    const { registerSkillTools } = await import('../src/lib/mcp-skills/tools.js');
    expect(BUILTIN_SKILL_PACK_IDS).toEqual([
      'inbox-triage',
      'meeting-prep',
      'teams-digest',
      'file-discovery',
      'permissions-security-review',
      'tenant-onboarding',
      'admin-operations',
    ]);

    const server = new McpServer({ name: 'skill-packs-test', version: '0.0.0' });
    registerSkillTools(server, { redis: new MemoryRedisFacade(), loadBuiltInPrompts: () => [] });

    await requestContext.run({ tenantId: TENANT_A }, async () => {
      const imported = await callTool(server, 'import-skill-pack', {
        builtInPackId: 'inbox-triage',
      });
      expect(imported.isError).toBeFalsy();
      expect(bodyOf(imported)).toMatchObject({
        packName: 'inbox-triage',
        imported: { skills: 1, recipes: 1, bookmarks: 1, facts: 1 },
      });
    });

    const { listTenantSkillRecords } = await import('../src/lib/mcp-skills/store.js');
    expect((await listTenantSkillRecords(TENANT_B)).map((skill) => skill.name)).toEqual([]);
  });
});
