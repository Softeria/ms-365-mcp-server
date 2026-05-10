import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import logger from '../../logger.js';
import { getRequestOwnerSubject, getRequestTenant } from '../../request-context.js';
import {
  renderSkillTemplate,
  SkillArgumentZod,
  SkillBodyZod,
  SkillDescriptionZod,
  SkillFrontmatterZod,
  SkillInputZod,
  SkillNameZod,
  SkillSourceZod,
  SkillTitleZod,
  SkillVisibilityZod,
  type SkillInput,
} from './schema.js';
import {
  disableTenantSkill,
  forkBuiltinSkillInput,
  getAccessibleSkillRecord,
  getVisibleSkillRecord,
  listTenantSkillRecords,
  listVisibleSkillRecords,
  saveTenantSkill,
  skillInputToPrompt,
  type SkillRecord,
} from './store.js';
import { getBuiltInSkillPack } from './builtin-packs.js';
import { SkillPackConflictStrategyZod, exportSkillPack, importSkillPack } from './packs.js';
import { SkillPackRootFileZod, readSkillPackFromRoot, writeSkillPackToRoot } from './roots.js';
import { validateSkillReferences } from './validation.js';
import type { PromptTemplateDefinition } from '../mcp-prompts/frontmatter.js';
import type { RedisClient } from '../redis.js';
import { publishPromptsListChanged, publishResourceUpdated } from '../mcp-notifications/events.js';
import { createMcpErrorEnvelope, createMcpResultEnvelope } from '../mcp-results/envelope.js';
import { MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA } from '../mcp-results/schemas.js';

const SKILL_CHANGE_REASON = 'skill-change';

export interface RegisterSkillToolsDeps {
  readonly redis: RedisClient;
  readonly readOnly?: boolean;
  readonly orgMode?: boolean;
  readonly loadBuiltInPrompts?: () => readonly PromptTemplateDefinition[];
}

const EmptyInputZod = z.object({}).passthrough();
const SkillLookupZod = z.object({ name: SkillNameZod });
const RenderSkillZod = z.object({ name: SkillNameZod, args: z.record(z.unknown()).default({}) });
const SaveSkillZod = z
  .object({
    name: SkillNameZod,
    title: SkillTitleZod,
    description: SkillDescriptionZod,
    frontmatter: SkillFrontmatterZod.default({}),
    body: SkillBodyZod,
    arguments: z.array(SkillArgumentZod).max(32).default([]),
    visibility: SkillVisibilityZod.default('tenant'),
    source: SkillSourceZod.default('custom'),
    sourceSkillName: SkillNameZod.optional(),
    version: z.number().int().min(1).default(1),
    enabled: z.boolean().default(true),
    published: z.boolean().default(true),
  })
  .strict();
const ValidateSkillZod = z.object({ skill: SkillInputZod });
const ImportSkillPackInputZod = z
  .object({
    pack: z.unknown().optional(),
    builtInPackId: z.string().trim().min(1).max(64).optional(),
    rootFile: SkillPackRootFileZod.optional(),
    conflictStrategy: SkillPackConflictStrategyZod.default('skip'),
  })
  .strict();
const ImportSkillPackZod = ImportSkillPackInputZod.refine(
  (value) =>
    value.pack !== undefined || value.builtInPackId !== undefined || value.rootFile !== undefined,
  {
    message: 'pack, builtInPackId, or rootFile is required',
  }
);
const ExportSkillPackZod = z
  .object({
    names: z.array(SkillNameZod).optional(),
    packName: z.string().trim().min(1).max(64).optional(),
    includeMemory: z.boolean().default(true),
    rootFile: SkillPackRootFileZod.optional(),
  })
  .strict();

function requireTenant(): { id: string; enabledToolsSet?: ReadonlySet<string> } | undefined {
  const tenant = getRequestTenant();
  if (!tenant.id) return undefined;
  return { id: tenant.id, enabledToolsSet: tenant.enabledToolsSet };
}

function skillResourceUris(tenantId: string, name?: string): string[] {
  return [
    `m365://tenant/${tenantId}/skills/index.json`,
    `mcp://tenant/${tenantId}/skills/index.json`,
    ...(name
      ? [
          `m365://tenant/${tenantId}/skills/${name}.md`,
          `mcp://tenant/${tenantId}/skills/${name}.md`,
          `m365://tenant/${tenantId}/skills/${name}.schema.json`,
          `mcp://tenant/${tenantId}/skills/${name}.schema.json`,
        ]
      : []),
  ];
}

async function publishSkillChange(
  redis: RedisClient,
  tenantId: string,
  name?: string
): Promise<void> {
  try {
    await publishPromptsListChanged(redis, tenantId, SKILL_CHANGE_REASON);
    await publishResourceUpdated(
      redis,
      tenantId,
      skillResourceUris(tenantId, name),
      SKILL_CHANGE_REASON
    );
  } catch (err) {
    logger.warn(
      { tenantId, err: (err as Error).message },
      'skill-tools: publish skill change failed; Redis notification skipped'
    );
  }
}

function builtInSkills(deps: RegisterSkillToolsDeps): SkillRecord[] {
  return (deps.loadBuiltInPrompts?.() ?? []).map((prompt) => ({
    name: prompt.name,
    title: prompt.name,
    description: prompt.description,
    frontmatter: {},
    body: prompt.template,
    arguments: [...prompt.arguments],
    visibility: 'tenant',
    source: 'builtin',
    version: 1,
    enabled: true,
  }));
}

function toPublicSkill(skill: SkillRecord): Record<string, unknown> {
  return {
    name: skill.name,
    title: skill.title,
    description: skill.description,
    frontmatter: skill.frontmatter,
    arguments: skill.arguments,
    visibility: skill.visibility,
    source: skill.source,
    sourceSkillName: skill.sourceSkillName,
    version: skill.version,
    enabled: skill.enabled,
    ownerSubject: skill.ownerSubject ?? undefined,
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
  };
}

function result(toolName: string, data: Record<string, unknown>, isError = false) {
  const envelope = isError
    ? createMcpErrorEnvelope({
        toolName,
        summary: `${toolName} failed: ${String(data.error ?? 'skill_error')}.`,
        code: String(data.error ?? 'skill_error'),
        message: String(data.error ?? 'skill_error'),
        data,
        nextActions: ['Check skill arguments, references, and tenant visibility before retrying.'],
      })
    : createMcpResultEnvelope({
        toolName,
        summary: `${toolName} completed.`,
        data,
        nextActions: [
          'Use list-skills, get-skill, render-skill, or skill resources for follow-up.',
        ],
      });
  return {
    ...envelope,
    content: [{ type: 'text' as const, text: JSON.stringify(data) }],
    ...(isError ? { isError: true } : {}),
  };
}

async function visibleSkillByName(
  tenantId: string,
  name: string,
  deps: RegisterSkillToolsDeps,
  ownerSubject?: string
): Promise<SkillRecord | null> {
  const tenantRecord = await getVisibleSkillRecord(tenantId, name, ownerSubject);
  if (tenantRecord) return tenantRecord;
  return builtInSkills(deps).find((skill) => skill.name === name) ?? null;
}

async function editableSkillByName(
  tenantId: string,
  name: string,
  ownerSubject?: string
): Promise<SkillRecord | null> {
  return getAccessibleSkillRecord(tenantId, name, ownerSubject);
}

function ownerForSkillInput(visibility: string): string | undefined {
  return visibility === 'user' ? getRequestOwnerSubject() : undefined;
}

export function registerSkillTools(server: McpServer, deps: RegisterSkillToolsDeps): void {
  server
    .tool(
      'list-skills',
      'List built-in and tenant/user editable skills visible to the caller.',
      {},
      { title: 'list-skills', readOnlyHint: true, openWorldHint: false },
      async (args) => {
        const parsed = EmptyInputZod.safeParse(args);
        if (!parsed.success) return result('list-skills', { error: 'invalid_skill_filter' }, true);
        const tenant = requireTenant();
        if (!tenant) return result('list-skills', { error: 'tenant_required' }, true);
        const ownerSubject = getRequestOwnerSubject();
        const allRows = await listTenantSkillRecords(tenant.id);
        const rows = await listVisibleSkillRecords(tenant.id, ownerSubject);
        const suppressed = new Set(
          allRows
            .filter(
              (skill) =>
                !skill.enabled &&
                skill.ownerSubject === null &&
                ['tenant', 'admin', 'builtin-copy'].includes(skill.visibility)
            )
            .map((skill) => skill.name)
        );
        const merged = new Map<string, SkillRecord>();
        for (const skill of builtInSkills(deps)) {
          if (!suppressed.has(skill.name)) merged.set(skill.name, skill);
        }
        for (const skill of rows) merged.set(skill.name, skill);
        return result('list-skills', { skills: [...merged.values()].map(toPublicSkill) });
      }
    )
    .update({ outputSchema: MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA.shape as never });

  server.tool(
    'get-skill',
    'Return skill metadata and body for a visible skill.',
    { name: SkillLookupZod.shape.name },
    { title: 'get-skill', readOnlyHint: true, openWorldHint: false },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return result('get-skill', { error: 'tenant_required' }, true);
      const parsed = SkillLookupZod.safeParse(args);
      if (!parsed.success) return result('get-skill', { error: 'invalid_skill_name' }, true);
      const skill = await visibleSkillByName(
        tenant.id,
        parsed.data.name,
        deps,
        getRequestOwnerSubject()
      );
      if (!skill) return result('get-skill', { error: 'skill_not_found' }, true);
      return result('get-skill', { skill: { ...toPublicSkill(skill), body: skill.body } });
    }
  );

  server.tool(
    'save-skill',
    'Create or update an editable skill after validating enabled tools and visible memory/resource references.',
    SaveSkillZod.shape,
    { title: 'save-skill', readOnlyHint: false, openWorldHint: false },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return result('save-skill', { error: 'tenant_required' }, true);
      const parsed = SaveSkillZod.safeParse(args);
      if (!parsed.success) {
        return result('save-skill', { error: 'invalid_skill', details: parsed.error.issues }, true);
      }
      const { published, ...skillInput } = parsed.data;
      const ownerSubject = ownerForSkillInput(skillInput.visibility);
      if (skillInput.visibility === 'user' && !ownerSubject) {
        return result('save-skill', { error: 'owner_subject_required' }, true);
      }
      const validation = await validateSkillReferences(skillInput, {
        tenantId: tenant.id,
        enabledToolsSet: tenant.enabledToolsSet,
        readOnly: deps.readOnly,
        orgMode: deps.orgMode,
        ownerSubject,
      });
      if (published && !validation.validation.ok) {
        return result(
          'save-skill',
          { error: 'skill_validation_failed', validation: validation.validation },
          true
        );
      }
      const skill = await saveTenantSkill(tenant.id, {
        ...(validation.skill ?? (skillInput as SkillInput)),
        enabled: published,
        ownerSubject,
      });
      await publishSkillChange(deps.redis, tenant.id, skill.name);
      return result('save-skill', {
        skill: toPublicSkill(skill),
        validation: validation.validation,
      });
    }
  );

  server.tool(
    'delete-skill',
    'Disable an editable tenant/user skill. Bundled built-ins cannot be deleted.',
    { name: SkillLookupZod.shape.name },
    { title: 'delete-skill', readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return result('delete-skill', { error: 'tenant_required' }, true);
      const parsed = SkillLookupZod.safeParse(args);
      if (!parsed.success) return result('delete-skill', { error: 'invalid_skill_name' }, true);
      const ownerSubject = getRequestOwnerSubject();
      const existing = await editableSkillByName(tenant.id, parsed.data.name, ownerSubject);
      if (!existing && builtInSkills(deps).some((skill) => skill.name === parsed.data.name)) {
        return result('delete-skill', { error: 'builtin_skill_readonly' }, true);
      }
      const deleted = existing
        ? await disableTenantSkill(tenant.id, parsed.data.name, existing.ownerSubject ?? undefined)
        : { deleted: false };
      if (deleted.deleted) await publishSkillChange(deps.redis, tenant.id, parsed.data.name);
      return result('delete-skill', deleted);
    }
  );

  server.tool(
    'fork-builtin-skill',
    'Copy a bundled read-only prompt into the tenant skill table for editing.',
    { name: SkillLookupZod.shape.name },
    { title: 'fork-builtin-skill', readOnlyHint: false, openWorldHint: false },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return result('fork-builtin-skill', { error: 'tenant_required' }, true);
      const parsed = SkillLookupZod.safeParse(args);
      if (!parsed.success)
        return result('fork-builtin-skill', { error: 'invalid_skill_name' }, true);
      const builtIn = deps
        .loadBuiltInPrompts?.()
        .find((prompt) => prompt.name === parsed.data.name);
      if (!builtIn) return result('fork-builtin-skill', { error: 'builtin_skill_not_found' }, true);
      const skill = await saveTenantSkill(
        tenant.id,
        forkBuiltinSkillInput(builtIn, getRequestOwnerSubject())
      );
      await publishSkillChange(deps.redis, tenant.id, skill.name);
      return result('fork-builtin-skill', { skill: toPublicSkill(skill) });
    }
  );

  server.tool(
    'render-skill',
    'Render a visible skill without executing Graph calls.',
    { name: RenderSkillZod.shape.name, args: RenderSkillZod.shape.args },
    { title: 'render-skill', readOnlyHint: true, openWorldHint: false },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return result('render-skill', { error: 'tenant_required' }, true);
      const parsed = RenderSkillZod.safeParse(args);
      if (!parsed.success) return result('render-skill', { error: 'invalid_render_args' }, true);
      const skill = await visibleSkillByName(
        tenant.id,
        parsed.data.name,
        deps,
        getRequestOwnerSubject()
      );
      if (!skill) return result('render-skill', { error: 'skill_not_found' }, true);
      const rendered = renderSkillTemplate(skill.body, parsed.data.args, skill.arguments);
      if (!rendered.ok)
        return result(
          'render-skill',
          { error: rendered.error.code, details: rendered.error },
          true
        );
      return result('render-skill', {
        name: skill.name,
        text: rendered.text,
        prompt: skillInputToPrompt(tenant.id, skill),
      });
    }
  );

  server.tool(
    'validate-skill',
    'Validate a skill body, frontmatter, references, and high-risk write metadata.',
    { skill: ValidateSkillZod.shape.skill },
    { title: 'validate-skill', readOnlyHint: true, openWorldHint: false },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return result('validate-skill', { error: 'tenant_required' }, true);
      const parsed = ValidateSkillZod.safeParse(args);
      if (!parsed.success)
        return result(
          'validate-skill',
          { error: 'invalid_skill', details: parsed.error.issues },
          true
        );
      const validation = await validateSkillReferences(parsed.data.skill, {
        tenantId: tenant.id,
        enabledToolsSet: tenant.enabledToolsSet,
        readOnly: deps.readOnly,
        orgMode: deps.orgMode,
        ownerSubject: getRequestOwnerSubject(),
      });
      return result('validate-skill', { validation: validation.validation });
    }
  );

  server.tool(
    'import-skill-pack',
    'Validate and import a skill pack payload. Roots/upload transports can pass the parsed pack body here.',
    ImportSkillPackInputZod.shape,
    { title: 'import-skill-pack', readOnlyHint: false, openWorldHint: false },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return result('import-skill-pack', { error: 'tenant_required' }, true);
      const parsed = ImportSkillPackZod.safeParse(args);
      if (!parsed.success)
        return result(
          'import-skill-pack',
          { error: 'invalid_skill_pack', details: parsed.error.issues },
          true
        );
      const pack = parsed.data.builtInPackId
        ? getBuiltInSkillPack(parsed.data.builtInPackId)
        : parsed.data.rootFile
          ? await readSkillPackFromRoot(parsed.data.rootFile)
          : parsed.data.pack;
      if (!pack) return result('import-skill-pack', { error: 'skill_pack_not_found' }, true);
      const imported = await importSkillPack(tenant.id, pack, {
        conflictStrategy: parsed.data.conflictStrategy,
        ownerSubject: getRequestOwnerSubject(),
        builtInSkillNames: new Set(builtInSkills(deps).map((skill) => skill.name)),
      });
      if (imported.imported.skills > 0) await publishSkillChange(deps.redis, tenant.id);
      return result('import-skill-pack', { ...imported });
    }
  );

  server.tool(
    'export-skill-pack',
    'Export visible skills as a JSON skill pack fallback payload.',
    ExportSkillPackZod.shape,
    { title: 'export-skill-pack', readOnlyHint: true, openWorldHint: false },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return result('export-skill-pack', { error: 'tenant_required' }, true);
      const parsed = ExportSkillPackZod.safeParse(args);
      if (!parsed.success)
        return result(
          'export-skill-pack',
          { error: 'invalid_skill_export', details: parsed.error.issues },
          true
        );
      const { rootFile, ...exportOptions } = parsed.data;
      const pack = await exportSkillPack(tenant.id, {
        ...exportOptions,
        ownerSubject: getRequestOwnerSubject(),
      });
      const rootWrite = rootFile ? await writeSkillPackToRoot(rootFile, pack) : undefined;
      return result('export-skill-pack', { pack, ...(rootWrite ? { rootWrite } : {}) });
    }
  );

  for (const name of [
    'get-skill',
    'save-skill',
    'delete-skill',
    'fork-builtin-skill',
    'render-skill',
    'validate-skill',
    'import-skill-pack',
    'export-skill-pack',
  ]) {
    (
      server as unknown as {
        _registeredTools: Record<string, { update: (input: { outputSchema: never }) => void }>;
      }
    )._registeredTools[name]?.update({
      outputSchema: MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA.shape as never,
    });
  }
}
