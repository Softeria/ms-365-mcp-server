import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { runInWorkerWithTimeout } from './worker-timeout.js';
import { positiveIntFromEnv } from './env.js';
import type { TruncatedMarkdown } from './document-conversion-worker.js';

/**
 * officeparser itself declares `node >=18.0.0`, but that is misleading once its own
 * dependencies are taken into account: file-type requires Node >=22 and the locked
 * pdfjs-dist@6.1.200 declares `engines.node: ">=22.13.0 || >=24"`. npm only warns rather
 * than blocking on an engines mismatch by default, so --enable-document-conversion would
 * otherwise install "successfully" on an unsupported Node and fail only the first time
 * convert-document is actually called, with an obscure error from deep inside one of those
 * dependencies rather than one that names the real cause.
 *
 * A major-only check (major < 22) is not tight enough: Node 22.0.0-22.12.x pass a
 * major-only check but are still below pdfjs-dist's real floor, so document conversion would
 * still fail lazily on first use for that range - exactly the failure mode this guard exists
 * to prevent. Verified with `semver.satisfies(version, '>=22.13.0 || >=24')` that the range
 * simplifies to a single floor of >=22.13.0: every 23.x and 24.x release is already
 * >=22.13.0 under plain version-tuple comparison, so the `|| >=24` disjunct is redundant and
 * matches nothing the first clause doesn't already cover. The real requirement is therefore:
 * major > 22, or (major === 22 and minor >= 13).
 */
export const MIN_NODE_MAJOR_FOR_DOCUMENT_CONVERSION = 22;
export const MIN_NODE_MINOR_FOR_DOCUMENT_CONVERSION = 13;
/** "22.13.0" - the precise floor, for use in messages. */
export const MIN_NODE_VERSION_FOR_DOCUMENT_CONVERSION = `${MIN_NODE_MAJOR_FOR_DOCUMENT_CONVERSION}.${MIN_NODE_MINOR_FOR_DOCUMENT_CONVERSION}.0`;

/** Thrown at startup when --enable-document-conversion is passed on a Node version too old
 *  for officeparser's own dependencies to run on. */
export class UnsupportedNodeVersionError extends Error {
  constructor(nodeVersion: string) {
    super(
      `--enable-document-conversion requires Node >=${MIN_NODE_VERSION_FOR_DOCUMENT_CONVERSION} ` +
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
 *
 * Compares major and minor as numbers (not the whole version string, and not a plain major
 * check) so that e.g. "22.9.0" is correctly treated as older than "22.13.0" - a lexicographic
 * string compare would get this backwards. Patch is irrelevant: every 22.13.x patch clears the
 * floor and every 22.12.x patch misses it, so only major.minor need to be parsed.
 */
export function assertNodeVersionSupportsDocumentConversion(
  nodeVersion: string = process.versions.node
): void {
  const [majorStr, minorStr] = nodeVersion.split('.');
  const major = Number.parseInt(majorStr, 10);
  const minor = Number.parseInt(minorStr, 10);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) {
    // Unparseable version string: fail open rather than blocking startup on a fluke.
    return;
  }
  const tooOld =
    major < MIN_NODE_MAJOR_FOR_DOCUMENT_CONVERSION ||
    (major === MIN_NODE_MAJOR_FOR_DOCUMENT_CONVERSION &&
      minor < MIN_NODE_MINOR_FOR_DOCUMENT_CONVERSION);
  if (tooOld) {
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

/**
 * Thrown when `MS365_MCP_MAX_CONCURRENT_CONVERSIONS` conversions are already running and
 * another call arrives. Deliberately a plain, retryable error rather than a queue: each worker
 * can claim up to `maxOldGenerationSizeMb` (default 512 MB) of its own heap, and with no cap on
 * concurrency, a handful of ordinary simultaneous convert-document calls — not necessarily
 * malicious, just a chatty client reading several attachments back to back — could each spin up
 * a worker and collectively exhaust host memory even though every individual worker stays under
 * its own limit. Rejecting outright (rather than queuing) sidesteps having to decide whether a
 * queued call's timeout clock starts at request time or at actual-run time; the caller already
 * has retry/backoff plumbing for ordinary tool errors, so "try again shortly" is a fine answer
 * for a personal-scale MCP server that will rarely if ever see genuine concurrent load this
 * high.
 */
export class TooManyConcurrentConversionsError extends Error {
  constructor(limit: number) {
    super(`Too many document conversions are already in progress (${limit}); try again shortly.`);
    this.name = 'TooManyConcurrentConversionsError';
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

// Each conversion worker can claim up to DEFAULT_MAX_OLD_GENERATION_SIZE_MB (512 MB) of its own
// heap. 3 concurrent workers therefore tops out around ~1.5 GB attributable to conversions
// alone, which is a reasonable ceiling to reserve out of a typical modern host's memory (a
// personal-scale deployment on a machine with, say, 4-8+ GB available) while still leaving
// headroom for the main server process, its own Graph-response buffering, and everything else
// running alongside it. Configurable via MS365_MCP_MAX_CONCURRENT_CONVERSIONS for deployments
// that want it higher or lower.
const DEFAULT_MAX_CONCURRENT_CONVERSIONS = 3;

// Process-wide count of in-flight conversions, scoped to this module (not to
// runInWorkerWithTimeout/worker-timeout.ts) since document conversion is currently the only
// caller of that generic helper and its memory profile (up to 512 MB per worker) is specific to
// this feature. A future second caller of runInWorkerWithTimeout with different needs should not
// be forced to share this limit; see the commit message for the full reasoning.
let activeConversions = 0;

/**
 * Prefers the compiled sibling (the real production shape: tsup compiles this project
 * 1:1 into dist/, no bundling). Falls back to the .ts source when only that exists — running
 * directly against TypeScript source (e.g. under vitest, which transforms this module's own
 * imports but has no effect on a separately spawned worker thread, since that thread does its
 * own plain Node module resolution). Node's own built-in TypeScript support (unflagged as of
 * Node 22/24) loads the .ts sibling directly with no build step or extra dependency needed,
 * which only matters for dev/test — assertNodeVersionSupportsDocumentConversion already
 * requires Node >=22.13.0 for this feature regardless.
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
 *
 * Bounded by a process-wide concurrency limit (`MS365_MCP_MAX_CONCURRENT_CONVERSIONS`, default
 * `DEFAULT_MAX_CONCURRENT_CONVERSIONS`): each worker can claim up to `maxOldGenerationSizeMb` of
 * its own heap, and nothing about the per-worker cap stops several calls arriving concurrently
 * from each spinning up their own worker and collectively exceeding host memory. Rather than
 * queuing excess calls (which would need an answer to "does a queued call's timeout start at
 * request time or run time?"), calls beyond the limit are rejected immediately with
 * `TooManyConcurrentConversionsError` — simpler to reason about and a legitimate fit for a
 * personal-scale MCP server that will rarely see genuine concurrent load this high.
 */
/**
 * Reserves one slot against `MS365_MCP_MAX_CONCURRENT_CONVERSIONS`, throwing
 * `TooManyConcurrentConversionsError` immediately (synchronously, before any `await`) if the
 * limit is already reached, and returns a release function the caller must invoke exactly once
 * when the reserved work is done (success or failure).
 *
 * Exported separately from `convertBufferToMarkdown` so a caller that must first fetch the
 * source bytes over the network (e.g. graph-tools.ts's convert-document handler) can reserve the
 * slot BEFORE that fetch rather than only once the bytes are already fully buffered in memory —
 * otherwise several concurrent calls could each buffer up to the source-size cap before any of
 * them is turned away, defeating the point of the limit. See convert-document's handler for the
 * paired acquire/release usage.
 */
export function acquireConversionSlot(): () => void {
  const limit = positiveIntFromEnv(
    'MS365_MCP_MAX_CONCURRENT_CONVERSIONS',
    DEFAULT_MAX_CONCURRENT_CONVERSIONS
  );
  // Synchronous check-then-increment: no `await` sits between reading activeConversions and
  // incrementing it, so two concurrent calls to this function cannot both observe the same
  // pre-increment count and both slip past the limit — the event loop cannot interleave them
  // mid-check the way it could if an await separated the read from the write.
  if (activeConversions >= limit) {
    throw new TooManyConcurrentConversionsError(limit);
  }
  activeConversions++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeConversions--;
  };
}

/**
 * Same conversion as `convertBufferToMarkdown`, but for callers that have already reserved
 * their own slot via `acquireConversionSlot()` (typically before fetching the source bytes) and
 * will release it themselves — this does not acquire or release a slot of its own, so it must
 * never be called without one already held, or the concurrency limit goes unenforced for that
 * call.
 */
export async function convertReservedBufferToMarkdown(
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
    return await runInWorkerWithTimeout<
      { arrayBuffer: ArrayBuffer; ocr: boolean; maxOutputChars: number },
      TruncatedMarkdown
    >({
      workerPath: WORKER_PATH,
      workerData: { arrayBuffer, ocr: options.ocr ?? false, maxOutputChars },
      transferList: [arrayBuffer],
      timeoutMs,
      maxOldGenerationSizeMb,
      describeTimeout: (ms) =>
        `Document conversion exceeded the ${ms}ms limit and was terminated. Try again with ` +
        'ocr disabled, or use download-bytes / download-bytes-to-file instead.',
    });
  } catch (error) {
    if ((error as Error).name === 'OfficeParserNotInstalled') {
      throw new OfficeParserNotInstalledError();
    }
    throw error;
  }
}

/**
 * Convenience wrapper for callers that have not already reserved a slot themselves: acquires
 * one via `acquireConversionSlot()`, runs the conversion, and always releases it afterwards.
 * Kept as the default entrypoint for direct/test callers; convert-document's handler uses
 * `acquireConversionSlot()` + `convertReservedBufferToMarkdown()` directly instead, so its slot
 * covers the network fetch too — see the comment on `acquireConversionSlot` for why.
 */
export async function convertBufferToMarkdown(
  buffer: Buffer,
  options: ConvertBufferOptions = {}
): Promise<ConvertBufferResult> {
  const release = acquireConversionSlot();
  try {
    return await convertReservedBufferToMarkdown(buffer, options);
  } finally {
    release();
  }
}
