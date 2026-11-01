import { constants } from 'fs';
import { open, realpath, stat, type FileHandle } from 'fs/promises';
import path from 'path';

/**
 * Deliberately not in the `.env` allowlist (see load-env.ts): a file in the
 * client's cwd must not be able to open up directories for reading.
 */
const UPLOAD_DIRS_ENV = 'MS365_MCP_UPLOAD_DIRS';

function uploadDirEntries(): string[] {
  return (process.env[UPLOAD_DIRS_ENV] ?? '')
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Directories upload-attachment-from-file may read from: MS365_MCP_UPLOAD_DIRS,
 * separated like PATH (":" on POSIX, ";" on Windows). Empty means the tool is off.
 */
export function getUploadDirs(): string[] {
  return uploadDirEntries().filter((entry) => path.isAbsolute(entry));
}

/** Refuse to start on a relative entry, which would resolve against whatever cwd the client launched us in. */
export function assertUploadDirsAbsolute(): void {
  const relative = uploadDirEntries().filter((entry) => !path.isAbsolute(entry));
  if (relative.length > 0) {
    throw new Error(
      `${UPLOAD_DIRS_ENV} entries must be absolute paths, got: ${relative.join(', ')}`
    );
  }
}

function isInside(dir: string, file: string): boolean {
  const relative = path.relative(dir, file);
  return (
    relative.length > 0 &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

export interface UploadFile {
  handle: FileHandle;
  size: number;
}

/**
 * Open `filePath` for reading if it is a regular file inside one of `dirs`.
 * Both sides are compared after symlinks are resolved, so a link inside an
 * allowed directory cannot point the read somewhere else. The caller closes
 * the handle.
 *
 * A missing file and a file outside the directories give the same error: a
 * distinct one would tell the caller which paths exist anywhere on the machine.
 */
export async function openUploadFile(filePath: string, dirs: string[]): Promise<UploadFile> {
  const refused = new Error(
    `filePath does not exist or is outside the directories allowed by ${UPLOAD_DIRS_ENV} (${dirs.join(', ')}).`
  );
  if (!path.isAbsolute(filePath)) {
    throw new Error(`filePath must be an absolute path. Received: ${filePath}`);
  }

  let realFile: string;
  try {
    realFile = await realpath(filePath);
  } catch {
    throw refused;
  }
  const realDirs = await Promise.all(dirs.map((dir) => realpath(dir).catch(() => null)));
  if (!realDirs.some((dir) => dir !== null && isInside(dir, realFile))) throw refused;

  // Checked before opening: opening a FIFO for reading blocks until a writer shows up.
  const checked = await stat(realFile, { bigint: true }).catch(() => null);
  if (!checked) throw refused;
  if (!checked.isFile()) throw new Error('filePath is not a regular file.');

  // realFile has no symlinks left in it, so one appearing now means the path was swapped
  // after the check. O_NOFOLLOW refuses that for the last component, and comparing the
  // opened file with the one that was checked covers a swapped parent directory.
  let handle: FileHandle;
  try {
    handle = await open(realFile, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  } catch {
    throw refused;
  }
  let stats;
  try {
    stats = await handle.stat({ bigint: true });
    if (!stats.isFile() || stats.dev !== checked.dev || stats.ino !== checked.ino) throw refused;
  } catch {
    await handle.close();
    throw refused;
  }
  return { handle, size: Number(stats.size) };
}
