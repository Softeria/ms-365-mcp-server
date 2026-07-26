import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { runInWorkerWithTimeout } from './worker-timeout.js';

/**
 * officeparser itself declares `node >=18.0.0`, but that is misleading once its own
 * dependencies are taken into account: file-type requires Node >=22 and pdfjs-dist requires
 * >=22.13.0 (or >=24). npm only warns rather than blocking on an engines mismatch by default,
 * so --enable-document-conversion would otherwise install "successfully" on Node 18/20 and
 * fail only the first time convert-document is actually called, with an obscure error from
 * deep inside one of those dependencies rather than one that names the real cause.
 */
export const MIN_NODE_MAJOR_FOR_DOCUMENT_CONVERSION = 22;

/** Thrown at startup when --enable-document-conversion is passed on a Node version too old
 *  for officeparser's own dependencies to run on. */
export class UnsupportedNodeVersionError extends Error {
  constructor(nodeVersion: string) {
    super(
      `--enable-document-conversion requires Node >=${MIN_NODE_MAJOR_FOR_DOCUMENT_CONVERSION} ` +
        `(running Node ${nodeVersion}). officeparser's own dependencies (file-type, pdfjs-dist) ` +
        'do not run on older Node, even though officeparser itself declares broader support. ' +
        'Upgrade Node, or omit --enable-document-conversion if you do not need convert-document.'
    );
    this.name = 'UnsupportedNodeVersionError';
  }
}

/**
 * Throws UnsupportedNodeVersionError when `nodeVersion` (default: the running process's own
 * Node version) is below what officeparser's dependency tree actually requires. Call at
 * startup, before accepting any traffic, so an incompatible Node version fails immediately
 * and clearly rather than on the first real convert-document call.
 */
export function assertNodeVersionSupportsDocumentConversion(
  nodeVersion: string = process.versions.node
): void {
  const major = Number.parseInt(nodeVersion.split('.')[0], 10);
  if (Number.isFinite(major) && major < MIN_NODE_MAJOR_FOR_DOCUMENT_CONVERSION) {
    throw new UnsupportedNodeVersionError(nodeVersion);
  }
}

/** Thrown when the optional `officeparser` package is not installed. */
export class OfficeParserNotInstalledError extends Error {
  constructor() {
    super(
      "convert-document requires the optional 'officeparser' package, which is not installed. " +
        'Run `npm install officeparser` alongside this server (it is an optionalDependency, so a ' +
        'plain `npm install` normally already includes it — this only happens after ' +
        '`npm install --omit=optional` or an install that pruned it).'
    );
    this.name = 'OfficeParserNotInstalledError';
  }
}

export interface ConvertBufferOptions {
  /** Run OCR on embedded images. Off by default: slower, and unnecessary for born-digital
   *  documents, which covers the large majority of email/drive attachments. */
  ocr?: boolean;
  /** Hard ceiling on parse time. Enforced by terminating the worker the parse runs in, not by
   *  asking the parser to cooperate — see the module doc comment below for why that matters. */
  timeoutMs?: number;
  /** Markdown output is cut to this many characters; `truncated` reports whether that
   *  happened, and `totalLength` is the untruncated length, so a caller can decide whether
   *  to ask for a narrower conversion instead of assuming everything came through. */
  maxOutputChars?: number;
  /** Caps the conversion worker's own heap. A pathological document exhausts only its own
   *  worker's budget, not the main server process's. */
  maxOldGenerationSizeMb?: number;
}

export interface ConvertBufferResult {
  markdown: string;
  truncated: boolean;
  totalLength: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_CHARS = 20_000;
const DEFAULT_MAX_OLD_GENERATION_SIZE_MB = 512;

/**
 * Prefers the compiled sibling (the real production shape: tsup compiles this project
 * 1:1 into dist/, no bundling). Falls back to the .ts source when only that exists — running
 * directly against TypeScript source (e.g. under vitest, which transforms this module's own
 * imports but has no effect on a separately spawned worker thread, since that thread does its
 * own plain Node module resolution). Node's own built-in TypeScript support (unflagged as of
 * Node 22/24) loads the .ts sibling directly with no build step or extra dependency needed,
 * which only matters for dev/test — assertNodeVersionSupportsDocumentConversion already
 * requires Node >=22 for this feature regardless.
 */
function resolveWorkerPath(): string {
  const compiled = fileURLToPath(new URL('./document-conversion-worker.js', import.meta.url));
  if (existsSync(compiled)) return compiled;
  return fileURLToPath(new URL('./document-conversion-worker.ts', import.meta.url));
}

const WORKER_PATH = resolveWorkerPath();

/**
 * Convert a binary document (PDF, DOCX, PPTX, XLSX, ODT, ...) already held in memory into
 * markdown. Never touches the filesystem and never accepts a path — callers must already
 * have the bytes (e.g. from a Graph fetch), keeping this usable from an HTTP-mode server
 * without adding disk-based attack surface.
 *
 * Runs inside a worker thread so the timeout is a real, hard bound rather than a cooperative
 * one. An AbortSignal-based timeout next to the parse call was tried first and does not work
 * for every format: officeparser's Excel/Word/PowerPoint parsers only check for cancellation
 * between loop iterations, with no `await` inside those loops, so on a large-but-ordinary
 * spreadsheet (nothing pathological — just wide) the whole single-threaded server sat blocked
 * for the entire parse regardless of the configured timeout, because the timer callback that
 * would trigger the abort never got a turn on the event loop until the parse finished on its
 * own. `worker.terminate()` from a wrapping thread is not cooperative — it stops the parse
 * whether or not its own code ever checks anything.
 */
export async function convertBufferToMarkdown(
  buffer: Buffer,
  options: ConvertBufferOptions = {}
): Promise<ConvertBufferResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputChars = options.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
  const maxOldGenerationSizeMb =
    options.maxOldGenerationSizeMb ?? DEFAULT_MAX_OLD_GENERATION_SIZE_MB;

  // buffer.buffer may be a larger pooled Node allocation than this one Buffer's own view into
  // it (Buffer.byteOffset/byteLength narrow a shared backing store) - slice to an ArrayBuffer
  // sized exactly to this buffer's own bytes before transferring, so the worker receives (and
  // the transfer moves ownership of) only this document's data, not unrelated pool memory.
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;

  try {
    const markdown = await runInWorkerWithTimeout<
      { arrayBuffer: ArrayBuffer; ocr: boolean },
      string
    >({
      workerPath: WORKER_PATH,
      workerData: { arrayBuffer, ocr: options.ocr ?? false },
      transferList: [arrayBuffer],
      timeoutMs,
      maxOldGenerationSizeMb,
      describeTimeout: (ms) =>
        `Document conversion exceeded the ${ms}ms limit and was terminated. Try again with ` +
        'ocr disabled, or use download-bytes / download-bytes-to-file instead.',
    });
    const totalLength = markdown.length;
    const truncated = totalLength > maxOutputChars;
    return {
      markdown: truncated ? markdown.slice(0, maxOutputChars) : markdown,
      truncated,
      totalLength,
    };
  } catch (error) {
    if ((error as Error).name === 'OfficeParserNotInstalled') {
      throw new OfficeParserNotInstalledError();
    }
    throw error;
  }
}
