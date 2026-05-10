import { z } from 'zod';
import { listBookmarks, upsertBookmark, type Bookmark } from '../memory/bookmarks.js';
import { recordFact, recallFacts, type Fact } from '../memory/facts.js';
import { listRecipes, saveRecipe, type Recipe } from '../memory/recipes.js';
import {
  getTenantSkillRecord,
  listTenantSkillRecords,
  listVisibleSkillRecords,
  saveTenantSkill,
  type SkillRecord,
} from './store.js';
import {
  SkillArgumentZod,
  SkillBodyZod,
  SkillDescriptionZod,
  SkillFrontmatterZod,
  SkillInputZod,
  SkillNameZod,
  SkillTitleZod,
  SkillVisibilityZod,
  type SkillInput,
} from './schema.js';

const PackIdZod = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);
const PackTitleZod = z.string().trim().min(1).max(256).optional();
const PackDescriptionZod = z.string().trim().min(1).max(2000).optional();
const OwnerSubjectZod = z.string().trim().min(1).max(512).optional();
const SkillPackResourceZod = z
  .object({
    path: z.string().trim().min(1).max(512),
    title: z.string().trim().min(1).max(256).optional(),
    mimeType: z.string().trim().min(1).max(128).optional(),
    text: z.string().max(50_000),
  })
  .strict();

const RecipeSeedZod = z
  .object({
    name: z.string().trim().min(1).max(256),
    alias: z.string().trim().min(1).max(512),
    params: z.record(z.unknown()).default({}),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

const BookmarkSeedZod = z
  .object({
    alias: z.string().trim().min(1).max(512),
    label: z.string().trim().min(1).max(256).optional(),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

const FactSeedZod = z
  .object({
    scope: z.string().trim().min(1).max(256),
    content: z.string().trim().min(1).max(8000),
  })
  .strict();

const PackSkillZod = z
  .object({
    name: SkillNameZod,
    title: SkillTitleZod,
    description: SkillDescriptionZod,
    frontmatter: SkillFrontmatterZod.default({}),
    body: SkillBodyZod,
    arguments: z.array(SkillArgumentZod).max(32).default([]),
    visibility: SkillVisibilityZod.default('tenant'),
    sourceSkillName: SkillNameZod.optional(),
    version: z.number().int().min(1).default(1),
    enabled: z.boolean().default(true),
  })
  .passthrough()
  .transform((skill) =>
    SkillInputZod.parse({
      ...skill,
      source: 'import',
    })
  );

const SkillRefZod = z.union([
  SkillNameZod,
  z
    .object({
      name: SkillNameZod,
      path: z.string().trim().min(1).max(512).optional(),
    })
    .passthrough(),
]);

const SkillPackManifestZod = z
  .object({
    id: PackIdZod.optional(),
    packName: PackIdZod.optional(),
    name: z.string().trim().min(1).max(256).optional(),
    title: PackTitleZod,
    description: PackDescriptionZod,
    version: z.union([z.number().int().min(1), z.string().trim().min(1).max(64)]).default(1),
    skills: z.array(SkillRefZod).max(128).optional(),
    recipes: z.array(z.string().trim().min(1).max(256)).max(128).optional(),
    bookmarks: z.array(z.string().trim().min(1).max(256)).max(128).optional(),
    facts: z.array(z.string().trim().min(1).max(256)).max(128).optional(),
    resources: z.array(z.string().trim().min(1).max(512)).max(128).optional(),
    signature: z.unknown().optional(),
    checksum: z.unknown().optional(),
    checksums: z.unknown().optional(),
  })
  .passthrough();

const RawPackZod = z
  .object({
    manifest: z.unknown().optional(),
    'manifest.json': z.unknown().optional(),
    id: PackIdZod.optional(),
    packName: PackIdZod.optional(),
    name: z.string().trim().min(1).max(256).optional(),
    title: PackTitleZod,
    description: PackDescriptionZod,
    version: z.union([z.number().int().min(1), z.string().trim().min(1).max(64)]).optional(),
    skills: z.array(z.unknown()).max(128).default([]),
    recipes: z.array(RecipeSeedZod).max(128).default([]),
    bookmarks: z.array(BookmarkSeedZod).max(128).default([]),
    facts: z.array(FactSeedZod).max(256).default([]),
    resources: z.array(SkillPackResourceZod).max(128).default([]),
    files: z.record(z.string().max(100_000)).default({}),
    signature: z.unknown().optional(),
    checksum: z.unknown().optional(),
    checksums: z.unknown().optional(),
  })
  .passthrough();

export const SkillPackConflictStrategyZod = z.enum([
  'skip',
  'fork',
  'overwrite-custom-only',
  'draft-import',
]);

export type SkillPackConflictStrategy = z.infer<typeof SkillPackConflictStrategyZod>;
export type SkillPackManifest = z.infer<typeof SkillPackManifestZod> & { id: string };
export type SkillPackResource = z.infer<typeof SkillPackResourceZod>;

export interface ParsedSkillPack {
  readonly packName: string;
  readonly manifest: SkillPackManifest;
  readonly skills: readonly SkillInput[];
  readonly recipes: readonly z.infer<typeof RecipeSeedZod>[];
  readonly bookmarks: readonly z.infer<typeof BookmarkSeedZod>[];
  readonly facts: readonly z.infer<typeof FactSeedZod>[];
  readonly resources: readonly SkillPackResource[];
  readonly trust: {
    readonly signaturePresent: boolean;
    readonly checksumPresent: boolean;
    readonly trusted: false;
  };
  readonly warnings: readonly string[];
}

export interface ImportSkillPackOptions {
  readonly conflictStrategy?: SkillPackConflictStrategy;
  readonly ownerSubject?: string;
  readonly builtInSkillNames?: ReadonlySet<string>;
}

export interface ExportSkillPackOptions {
  readonly names?: readonly string[];
  readonly packName?: string;
  readonly ownerSubject?: string;
  readonly includeMemory?: boolean;
}

export interface ImportSkillPackResult {
  readonly packName: string;
  readonly imported: {
    readonly skills: number;
    readonly recipes: number;
    readonly bookmarks: number;
    readonly facts: number;
  };
  readonly skipped: {
    readonly skills: readonly string[];
  };
  readonly renamed: ReadonlyArray<{ readonly from: string; readonly to: string }>;
  readonly warnings: readonly string[];
  readonly trust: ParsedSkillPack['trust'];
}

export interface ExportedSkillPack {
  readonly packName: string;
  readonly manifest: SkillPackManifest;
  readonly skills: readonly SkillInput[];
  readonly recipes: readonly Recipe[];
  readonly bookmarks: readonly Bookmark[];
  readonly facts: readonly Fact[];
  readonly resources: readonly SkillPackResource[];
  readonly trust: ParsedSkillPack['trust'];
}

type RawPack = z.infer<typeof RawPackZod>;
type RecipeSeed = z.infer<typeof RecipeSeedZod>;
type BookmarkSeed = z.infer<typeof BookmarkSeedZod>;
type FactSeed = z.infer<typeof FactSeedZod>;

function parseJsonMaybe(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return JSON.parse(value) as unknown;
}

function slugFromName(value: string | undefined): string {
  const slug = (value ?? 'skill-pack')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return PackIdZod.safeParse(slug).success ? slug : 'skill-pack';
}

function normalizeManifest(raw: RawPack): SkillPackManifest {
  const manifestInput = parseJsonMaybe(raw['manifest.json'] ?? raw.manifest ?? {});
  const manifest = SkillPackManifestZod.parse(manifestInput);
  const id =
    manifest.id ??
    manifest.packName ??
    raw.id ??
    raw.packName ??
    slugFromName(manifest.name ?? raw.name);
  return {
    ...manifest,
    id,
    packName: manifest.packName ?? id,
    name: manifest.name ?? raw.name ?? id,
    title: manifest.title ?? raw.title,
    description: manifest.description ?? raw.description,
    version: manifest.version ?? raw.version ?? 1,
  };
}

function parseSimpleFrontmatter(value: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const line of value.split('\n')) {
    const match = /^([a-zA-Z0-9_-]+):\s*(.*)$/.exec(line.trim());
    if (!match) continue;
    const raw = match[2].trim();
    if (raw.startsWith('[') || raw.startsWith('{')) {
      data[match[1]] = JSON.parse(raw) as unknown;
    } else if (raw === 'true' || raw === 'false') {
      data[match[1]] = raw === 'true';
    } else if (raw.length > 0) {
      data[match[1]] = raw.replace(/^['"]|['"]$/g, '');
    }
  }
  return data;
}

function splitMarkdownFrontmatter(markdown: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  if (!markdown.startsWith('---\n')) return { frontmatter: {}, body: markdown };
  const end = markdown.indexOf('\n---', 4);
  if (end === -1) return { frontmatter: {}, body: markdown };
  const rawFrontmatter = markdown.slice(4, end).trim();
  const body = markdown.slice(end + 4).replace(/^\n/, '');
  try {
    return { frontmatter: JSON.parse(rawFrontmatter) as Record<string, unknown>, body };
  } catch {
    return { frontmatter: parseSimpleFrontmatter(rawFrontmatter), body };
  }
}

function nameFromPath(filePath: string): string {
  const fileName = filePath.split('/').pop() ?? filePath;
  return fileName.replace(/\.md$/i, '').slice(0, 64);
}

function parseMarkdownSkill(filePath: string, markdown: string): SkillInput {
  const parsed = splitMarkdownFrontmatter(markdown);
  const { name, title, description, arguments: args, ...frontmatter } = parsed.frontmatter;
  const fallbackName = nameFromPath(filePath);
  return PackSkillZod.parse({
    name: typeof name === 'string' ? name : fallbackName,
    title: typeof title === 'string' ? title : typeof name === 'string' ? name : fallbackName,
    description: typeof description === 'string' ? description : `Imported skill ${fallbackName}`,
    frontmatter,
    body: parsed.body,
    arguments: Array.isArray(args) ? args : [],
  });
}

function parseSkills(raw: RawPack): SkillInput[] {
  const direct = raw.skills.map((skill) => PackSkillZod.parse(skill));
  const markdownSkills = Object.entries(raw.files)
    .filter(([filePath]) => filePath.endsWith('.md'))
    .map(([filePath, text]) => parseMarkdownSkill(filePath, text));
  return [...direct, ...markdownSkills];
}

function trustWarnings(
  raw: RawPack,
  manifest: SkillPackManifest
): {
  warnings: string[];
  trust: ParsedSkillPack['trust'];
} {
  const signaturePresent = raw.signature !== undefined || manifest.signature !== undefined;
  const checksumPresent =
    raw.checksum !== undefined ||
    raw.checksums !== undefined ||
    manifest.checksum !== undefined ||
    manifest.checksums !== undefined;
  return {
    warnings: [
      ...(signaturePresent
        ? ['Skill pack signature metadata is reserved and was parsed but not trusted.']
        : []),
      ...(checksumPresent
        ? ['Skill pack checksum metadata is reserved and was parsed but not trusted.']
        : []),
    ],
    trust: { signaturePresent, checksumPresent, trusted: false },
  };
}

export function parseSkillPackPayload(input: unknown): ParsedSkillPack {
  const raw = RawPackZod.parse(parseJsonMaybe(input));
  const manifest = normalizeManifest(raw);
  const { warnings, trust } = trustWarnings(raw, manifest);
  return {
    packName: manifest.id,
    manifest,
    skills: parseSkills(raw),
    recipes: raw.recipes,
    bookmarks: raw.bookmarks,
    facts: raw.facts,
    resources: raw.resources,
    trust,
    warnings,
  };
}

function countImportedMemory(items: readonly unknown[]): number {
  return items.length;
}

async function existingSkill(
  tenantId: string,
  name: string,
  ownerSubject?: string
): Promise<SkillRecord | null> {
  if (!ownerSubject) return getTenantSkillRecord(tenantId, name);
  const rows = await listTenantSkillRecords(tenantId);
  return rows.find((skill) => skill.name === name && skill.ownerSubject === ownerSubject) ?? null;
}

function appendSuffix(name: string, suffix: string): string {
  return `${name.slice(0, Math.max(1, 64 - suffix.length))}${suffix}`;
}

async function uniqueSkillName(
  tenantId: string,
  name: string,
  ownerSubject: string | undefined,
  builtInSkillNames: ReadonlySet<string>,
  suffixBase: string
): Promise<string> {
  for (let index = 1; index <= 100; index += 1) {
    const suffix = index === 1 ? suffixBase : `${suffixBase}-${index}`;
    const candidate = SkillNameZod.parse(appendSuffix(name, suffix));
    if (
      !builtInSkillNames.has(candidate) &&
      !(await existingSkill(tenantId, candidate, ownerSubject))
    ) {
      return candidate;
    }
  }
  throw new Error(`Unable to allocate imported skill name for ${name}`);
}

function normalizeImportedSkill(skill: SkillInput, input: Partial<SkillInput> = {}): SkillInput {
  return SkillInputZod.parse({
    ...skill,
    ...input,
    source: 'import',
    sourceSkillName: input.sourceSkillName ?? skill.sourceSkillName,
  });
}

async function saveImportedSkill(
  tenantId: string,
  skill: SkillInput,
  options: Required<Pick<ImportSkillPackOptions, 'builtInSkillNames'>> & {
    readonly conflictStrategy: SkillPackConflictStrategy;
    readonly ownerSubject?: string;
  }
): Promise<
  | { imported: true; name: string; renamed?: { from: string; to: string }; warning?: string }
  | { imported: false; name: string; warning: string }
> {
  const ownerSubject =
    skill.visibility === 'user' ? OwnerSubjectZod.parse(options.ownerSubject) : undefined;
  if (skill.visibility === 'user' && !ownerSubject) {
    return {
      imported: false,
      name: skill.name,
      warning: `Skipped user-scope skill ${skill.name}; ownerSubject is required.`,
    };
  }

  const builtInConflict = options.builtInSkillNames.has(skill.name);
  const existing = await existingSkill(tenantId, skill.name, ownerSubject);
  const hasConflict = builtInConflict || existing !== null;

  if (hasConflict && options.conflictStrategy === 'skip') {
    return {
      imported: false,
      name: skill.name,
      warning: `Skipped skill ${skill.name}; conflictStrategy=skip.`,
    };
  }

  if (hasConflict && options.conflictStrategy === 'overwrite-custom-only') {
    if (builtInConflict || existing?.source === 'builtin') {
      return {
        imported: false,
        name: skill.name,
        warning: `Skipped skill ${skill.name}; built-in skills cannot be overwritten.`,
      };
    }
    await saveTenantSkill(tenantId, {
      ...normalizeImportedSkill(skill, { enabled: skill.enabled }),
      ownerSubject,
    });
    return { imported: true, name: skill.name };
  }

  const shouldRename = hasConflict && ['fork', 'draft-import'].includes(options.conflictStrategy);
  const renamedName = shouldRename
    ? await uniqueSkillName(
        tenantId,
        skill.name,
        ownerSubject,
        options.builtInSkillNames,
        options.conflictStrategy === 'fork' ? '-fork' : '-draft'
      )
    : skill.name;
  const savedSkill = normalizeImportedSkill(skill, {
    name: renamedName,
    sourceSkillName: renamedName === skill.name ? skill.sourceSkillName : skill.name,
    enabled: options.conflictStrategy === 'draft-import' ? false : skill.enabled,
  });
  await saveTenantSkill(tenantId, { ...savedSkill, ownerSubject });
  return {
    imported: true,
    name: savedSkill.name,
    ...(renamedName === skill.name ? {} : { renamed: { from: skill.name, to: renamedName } }),
  };
}

export async function importSkillPack(
  tenantId: string,
  input: unknown,
  options: ImportSkillPackOptions = {}
): Promise<ImportSkillPackResult> {
  const pack = parseSkillPackPayload(input);
  const conflictStrategy = SkillPackConflictStrategyZod.parse(options.conflictStrategy ?? 'skip');
  const builtInSkillNames = options.builtInSkillNames ?? new Set<string>();
  const warnings = [...pack.warnings];
  const skipped: string[] = [];
  const renamed: Array<{ from: string; to: string }> = [];
  let importedSkills = 0;

  const memoryOwnerSubject = options.ownerSubject;
  for (const recipe of pack.recipes)
    await saveRecipe(tenantId, recipe as RecipeSeed, memoryOwnerSubject);
  for (const bookmark of pack.bookmarks)
    await upsertBookmark(tenantId, bookmark as BookmarkSeed, memoryOwnerSubject);
  for (const fact of pack.facts) await recordFact(tenantId, fact as FactSeed, memoryOwnerSubject);

  for (const skill of pack.skills) {
    const saved = await saveImportedSkill(tenantId, skill, {
      conflictStrategy,
      ownerSubject: options.ownerSubject,
      builtInSkillNames,
    });
    if (saved.imported) {
      importedSkills += 1;
      if (saved.renamed) renamed.push(saved.renamed);
    } else {
      skipped.push(saved.name);
    }
    if (saved.warning) warnings.push(saved.warning);
  }

  return {
    packName: pack.packName,
    imported: {
      skills: importedSkills,
      recipes: countImportedMemory(pack.recipes),
      bookmarks: countImportedMemory(pack.bookmarks),
      facts: countImportedMemory(pack.facts),
    },
    skipped: { skills: skipped },
    renamed,
    warnings,
    trust: pack.trust,
  };
}

function skillRefs(skills: readonly SkillRecord[]): {
  recipes: Set<string>;
  bookmarks: Set<string>;
  facts: Set<string>;
} {
  const recipes = new Set<string>();
  const bookmarks = new Set<string>();
  const facts = new Set<string>();
  for (const skill of skills) {
    for (const name of skill.frontmatter.recipes ?? []) recipes.add(name);
    for (const name of skill.frontmatter.bookmarks ?? []) bookmarks.add(name);
    for (const name of skill.frontmatter.facts ?? []) facts.add(name);
  }
  return { recipes, bookmarks, facts };
}

async function exportedFacts(
  tenantId: string,
  scopes: ReadonlySet<string>,
  ownerSubject?: string
): Promise<Fact[]> {
  const facts = await Promise.all(
    [...scopes].map((scope) => recallFacts(tenantId, { scope, limit: 50 }, ownerSubject))
  );
  return facts.flat();
}

function exportSkillInput(skill: SkillRecord): SkillInput {
  return SkillInputZod.parse({
    name: skill.name,
    title: skill.title,
    description: skill.description,
    frontmatter: skill.frontmatter,
    body: skill.body,
    arguments: skill.arguments,
    visibility: skill.visibility,
    source: 'import',
    sourceSkillName: skill.sourceSkillName,
    version: skill.version,
    enabled: skill.enabled,
  });
}

export async function exportSkillPack(
  tenantId: string,
  options: ExportSkillPackOptions = {}
): Promise<ExportedSkillPack> {
  const packName = PackIdZod.parse(options.packName ?? 'export');
  const names = new Set((options.names ?? []).map((name) => SkillNameZod.parse(name)));
  const skills = (await listVisibleSkillRecords(tenantId, options.ownerSubject)).filter(
    (skill) => names.size === 0 || names.has(skill.name)
  );
  const refs = skillRefs(skills);
  const includeMemory = options.includeMemory ?? true;
  const recipes = includeMemory
    ? (await listRecipes(tenantId, undefined, options.ownerSubject)).filter((recipe) =>
        refs.recipes.has(recipe.name)
      )
    : [];
  const bookmarks = includeMemory
    ? (await listBookmarks(tenantId, undefined, options.ownerSubject)).filter(
        (bookmark) => refs.bookmarks.has(bookmark.alias) || refs.bookmarks.has(bookmark.label ?? '')
      )
    : [];
  const facts = includeMemory
    ? await exportedFacts(tenantId, refs.facts, options.ownerSubject)
    : [];
  const manifest: SkillPackManifest = {
    id: packName,
    packName,
    name: packName,
    version: 1,
    skills: skills.map((skill) => skill.name),
    recipes: recipes.map((recipe) => recipe.name),
    bookmarks: bookmarks.map((bookmark) => bookmark.label ?? bookmark.alias),
    facts: [...refs.facts],
    resources: [],
  };
  return {
    packName,
    manifest,
    skills: skills.map(exportSkillInput),
    recipes,
    bookmarks,
    facts,
    resources: [],
    trust: { signaturePresent: false, checksumPresent: false, trusted: false },
  };
}
