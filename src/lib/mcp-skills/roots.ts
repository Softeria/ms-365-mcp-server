import { mkdir, open, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const DEFAULT_MAX_ROOT_FILE_BYTES = 1_048_576;
const ALLOWED_ROOT_EXTENSIONS = new Set(['.json']);
const SECRET_BASENAME_PATTERN =
  /^(?:\.env(?:\..*)?|credentials\.json|\.token-cache\.json)$|\.(?:pem|key|p12|pfx|crt|cer)$/i;

const RootUriZod = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => value.startsWith('file://'), {
    message: 'Only local file:// roots are supported.',
  });
const RelativePathZod = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .refine((value) => !path.isAbsolute(value), { message: 'Path must be relative to the root.' })
  .refine((value) => !value.split(/[\\/]+/).includes('..'), {
    message: 'Path must not traverse outside the root.',
  });

export const SkillPackRootFileZod = z
  .object({
    rootUri: RootUriZod,
    path: RelativePathZod,
  })
  .strict();

export type SkillPackRootFile = z.infer<typeof SkillPackRootFileZod>;

export interface SkillPackRootWriteResult {
  readonly rootUri: string;
  readonly path: string;
  readonly bytes: number;
}

function rootPath(rootUri: string): string {
  const url = new URL(rootUri);
  if (url.protocol !== 'file:') throw new Error('Only file:// roots are supported.');
  return fileURLToPath(url);
}

function maxRootFileBytes(): number {
  const raw = Number.parseInt(process.env.MS365_MCP_ROOTS_MAX_BYTES ?? '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_ROOT_FILE_BYTES;
}

function assertSafeSkillPackPath(target: string): void {
  const basename = path.basename(target);
  if (
    SECRET_BASENAME_PATTERN.test(basename) ||
    /(?:secret|token|credential|private[-_]?key)/i.test(basename)
  ) {
    throw new Error('Skill pack roots refuse secret-looking filenames.');
  }
  if (!ALLOWED_ROOT_EXTENSIONS.has(path.extname(basename).toLowerCase())) {
    throw new Error('Only .json skill-pack root files are supported.');
  }
}

function resolveInsideRoot(input: SkillPackRootFile): { root: string; target: string } {
  const parsed = SkillPackRootFileZod.parse(input);
  const root = path.resolve(rootPath(parsed.rootUri));
  const target = path.resolve(root, parsed.path);
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Skill pack path escapes the declared root.');
  }
  assertSafeSkillPackPath(target);
  return { root, target };
}

async function assertRealPathInsideRoot(root: string, target: string): Promise<void> {
  const [realRoot, realTarget] = await Promise.all([realpath(root), realpath(target)]);
  const relative = path.relative(realRoot, realTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Skill pack path escapes the declared root.');
  }
}

export async function readSkillPackFromRoot(input: SkillPackRootFile): Promise<unknown> {
  const { root, target } = resolveInsideRoot(input);
  await assertRealPathInsideRoot(root, target);
  const file = await open(target, 'r');
  try {
    const fileStats = await file.stat();
    if (fileStats.size > maxRootFileBytes()) {
      throw new Error('Skill pack root file exceeds maximum allowed size.');
    }
    const text = await file.readFile('utf8');
    if (Buffer.byteLength(text, 'utf8') > maxRootFileBytes()) {
      throw new Error('Skill pack root file exceeds maximum allowed size.');
    }
    return JSON.parse(text) as unknown;
  } finally {
    await file.close();
  }
}

export async function writeSkillPackToRoot(
  input: SkillPackRootFile,
  pack: unknown
): Promise<SkillPackRootWriteResult> {
  const { root, target } = resolveInsideRoot(input);
  const text = `${JSON.stringify(pack, null, 2)}\n`;
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > maxRootFileBytes()) {
    throw new Error('Skill pack root file exceeds maximum allowed size.');
  }
  await mkdir(path.dirname(target), { recursive: true });
  const realParent = await realpath(path.dirname(target));
  const realRoot = await realpath(root);
  const relative = path.relative(realRoot, realParent);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Skill pack path escapes the declared root.');
  }
  await writeFile(target, text, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  return { ...input, bytes };
}
