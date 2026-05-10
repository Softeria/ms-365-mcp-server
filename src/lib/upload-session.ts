/**
 * UploadSessionHelper (MWARE-05, Plan 02-06) — Graph resumable upload with
 * 320 KiB chunk alignment, `nextExpectedRanges` resume protocol, and a
 * progress iterator per D-08.
 *
 * Lifecycle:
 *   1. POST /{path}/createUploadSession  — via graphClient (full chain:
 *      ETag → Retry → ODataError → TokenRefresh).
 *   2. For each chunk: direct fetch(uploadUrl, { method: 'PUT', body,
 *      headers: { Content-Length, Content-Range } })  — NO Authorization.
 *   3. On 5xx / 416: GET uploadUrl → nextExpectedRanges → resume.
 *   4. Final chunk returns 200/201 with DriveItem.
 *
 * Chunk PUTs bypass the graphClient middleware chain intentionally (per D-08
 * and RESEARCH.md "Anti-Patterns / Retry chain re-executing"):
 *   - No Authorization header — uploadUrl is pre-authenticated; attaching
 *     Authorization causes Graph to return 401 (T-02-06d).
 *   - Content-Range header is not an OData 2xx resource shape; the
 *     ODataErrorHandler would misinterpret the intermediate 202 envelope.
 *   - Resume loop handles retry at byte-offset granularity; RetryHandler
 *     would double-retry (chunks already retried would re-upload), fighting
 *     the resume protocol.
 *
 * Memory: Phase 2 accepts a Buffer input; single-process Node holds the
 * whole file plus one chunk in memory at a time. The 60 MiB cap is
 * per-chunk; a 200 MB file is uploaded in multiple chunks, but the caller
 * still passes the full Buffer. Streaming ingestion (ReadableStream) is
 * deferred to Phase 5.
 *
 * Observability: logs at info on session create + final commit; at warn on
 * each 5xx/416 recovery. NEVER logs the uploadUrl itself (T-02-06a — URL
 * leakage is a session hijack vector).
 */

import logger from '../logger.js';
import { parseODataError } from './graph-errors.js';

/** Graph-mandated chunk alignment: 320 KiB (327,680 bytes). */
export const CHUNK_SIZE_ALIGNMENT = 320 * 1024;

/** Microsoft's documented sweet spot: 320 KiB × 10 = 3,276,800 bytes (~3.125 MB). */
export const DEFAULT_CHUNK_SIZE = CHUNK_SIZE_ALIGNMENT * 10;

/** Microsoft's hard cap per chunk: 60 MiB (62,914,560 bytes). */
export const MAX_CHUNK_SIZE = 60 * 1024 * 1024;

/**
 * Per-chunk resume-attempt ceiling. A single chunk that 5xx/416s more than
 * this is treated as a hard failure — otherwise a pathological server could
 * livelock the helper. Matches the overall retry cap from D-05 (3 attempts)
 * and the T-02-06e mitigation.
 */
const MAX_RESUME_ATTEMPTS = 3;

/** Progress event yielded by {@link UploadSessionHelper.uploadLargeFileIter}. */
export interface UploadProgress {
  bytesSent: number;
  totalBytes: number;
}

/** Caller-facing options for {@link UploadSessionHelper.uploadLargeFile}. */
export interface UploadSessionOptions {
  /**
   * Chunk size in bytes. Snapped DOWN to nearest 320 KiB multiple; clamped
   * to {@link MAX_CHUNK_SIZE}. Zero / missing falls back to
   * `MS365_MCP_UPLOAD_CHUNK_SIZE_BYTES` env var or {@link DEFAULT_CHUNK_SIZE}.
   */
  chunkSize?: number;
  /** Graph `@microsoft.graph.conflictBehavior` (default `rename`). */
  conflictBehavior?: 'rename' | 'replace' | 'fail';
  /** Optional override for the uploaded file name. */
  fileName?: string;
}

/**
 * Minimal shape of a Graph DriveItem returned on successful upload. The full
 * shape is documented at
 *   https://learn.microsoft.com/graph/api/resources/driveitem
 * — we surface the strongly-typed fields callers are most likely to read and
 * pass through everything else via the index signature.
 */
export interface DriveItem {
  id: string;
  name: string;
  webUrl?: string;
  size?: number;
  [key: string]: unknown;
}

interface UploadSessionGraphClient {
  graphRequest(
    endpoint: string,
    options: { method: 'POST'; body: string }
  ): Promise<{ content?: Array<{ text?: string }> }>;
}

/** Shape of the POST /createUploadSession response envelope. */
interface SessionCreateResponse {
  uploadUrl: string;
  expirationDateTime: string;
}

/**
 * Snap a requested chunk size DOWN to the nearest 320 KiB multiple, clamped
 * to {@link MAX_CHUNK_SIZE}. The result is always at least one alignment
 * unit ({@link CHUNK_SIZE_ALIGNMENT}) — zero / negative / non-finite input
 * floors to the minimum rather than the default. Callers who want the
 * documented 3.125 MB sweet spot should pass {@link DEFAULT_CHUNK_SIZE}
 * explicitly (the {@link UploadSessionOptions.chunkSize} resolver does this).
 *
 * Pure function — safe to call before any graphClient is constructed.
 */
export function alignChunkSize(requested: number): number {
  const base = Number.isFinite(requested) && requested > 0 ? requested : 0;
  const clamped = Math.min(base, MAX_CHUNK_SIZE);
  const aligned = Math.floor(clamped / CHUNK_SIZE_ALIGNMENT) * CHUNK_SIZE_ALIGNMENT;
  return aligned > 0 ? aligned : CHUNK_SIZE_ALIGNMENT;
}

/**
 * Parse Graph's `nextExpectedRanges` string array into structured ranges.
 * Accepts both closed (`"12345-55232"`) and open-ended (`"77829-"`) forms
 * per the upload-session protocol. Returns an array of
 * `{ start, end? }` objects in the same order as the input.
 *
 * Pure function — no side effects, safe to call with untrusted input.
 */
export function parseNextExpectedRanges(ranges: string[]): Array<{ start: number; end?: number }> {
  return ranges.map((r) => {
    const [startStr, endStr] = r.split('-');
    const start = Number.parseInt(startStr, 10);
    const end = endStr ? Number.parseInt(endStr, 10) : undefined;
    return end !== undefined && Number.isFinite(end) ? { start, end } : { start };
  });
}

/**
 * Format a Content-Range header for a chunk PUT, e.g. `bytes 0-327679/655360`.
 */
function formatContentRange(start: number, end: number, total: number): string {
  return `bytes ${start}-${end}/${total}`;
}

/**
 * Read the chunk-size preference from the environment, falling back to the
 * default. Called by the iterator when `options.chunkSize` is not supplied.
 */
function chunkSizeFromEnv(): number {
  const raw = process.env.MS365_MCP_UPLOAD_CHUNK_SIZE_BYTES;
  if (!raw) return DEFAULT_CHUNK_SIZE;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CHUNK_SIZE;
}

/**
 * Helper that orchestrates a Graph upload-session lifecycle end-to-end with
 * byte-offset resume on transient chunk failures. Accepts any `GraphClient`
 * for the session-creation POST; chunk PUTs go through the native `fetch`
 * global so they bypass the middleware pipeline.
 *
 * The helper is NOT a `GraphMiddleware` — it is a caller that layers on top
 * of graphClient, analogous to 02-04's `pageIterator` and 02-05's `batch()`.
 */
export class UploadSessionHelper {
  constructor(private readonly graphClient: UploadSessionGraphClient) {}

  /**
   * Upload `fileBuffer` as a single resumable session. Resolves with the
   * created {@link DriveItem} on success; rejects with a typed `GraphError`
   * (or plain `Error` for caller-side validation) on failure.
   */
  async uploadLargeFile(
    driveItemPath: string,
    fileBuffer: Buffer,
    options: UploadSessionOptions = {}
  ): Promise<DriveItem> {
    const iter = this.uploadLargeFileIter(driveItemPath, fileBuffer, options);
    let result: IteratorResult<UploadProgress, DriveItem>;
    do {
      result = await iter.next();
    } while (!result.done);
    return result.value;
  }

  /**
   * Streaming variant — yields `{ bytesSent, totalBytes }` progress events on
   * every successful chunk PUT, and returns the {@link DriveItem} as the
   * final iterator value. Phase 5 will plumb this into the MCP tool-level
   * progress-notification channel.
   */
  async *uploadLargeFileIter(
    driveItemPath: string,
    fileBuffer: Buffer,
    options: UploadSessionOptions = {}
  ): AsyncGenerator<UploadProgress, DriveItem, void> {
    const chunkSize = alignChunkSize(options.chunkSize ?? chunkSizeFromEnv());
    const totalBytes = fileBuffer.byteLength;
    if (totalBytes === 0) {
      throw new Error('uploadLargeFile: file buffer is empty');
    }

    // Step 1 — create session through the FULL middleware chain (retry,
    // error parsing, auth). Errors here bubble as typed GraphError already.
    const sessionBody = {
      item: {
        '@microsoft.graph.conflictBehavior': options.conflictBehavior ?? 'rename',
        ...(options.fileName ? { name: options.fileName } : {}),
      },
    };
    const createEndpoint = `${driveItemPath}:/createUploadSession`.replace(/::/g, ':');
    const createResp = await this.graphClient.graphRequest(createEndpoint, {
      method: 'POST',
      body: JSON.stringify(sessionBody),
    });
    const createText = createResp?.content?.[0]?.text;
    if (!createText) {
      throw new Error('createUploadSession returned empty response');
    }
    const session = JSON.parse(createText) as SessionCreateResponse;
    if (!session.uploadUrl) {
      throw new Error('createUploadSession response missing uploadUrl');
    }
    const uploadUrl = session.uploadUrl;

    // T-02-06a: NEVER log the uploadUrl — leaks the pre-authenticated session.
    logger.info(
      { chunkSize, totalBytes, totalChunks: Math.ceil(totalBytes / chunkSize) },
      'upload session created'
    );

    // Step 2 — chunk PUT loop
    let offset = 0;
    while (offset < totalBytes) {
      const chunkEnd = Math.min(offset + chunkSize, totalBytes) - 1;
      const slice = fileBuffer.subarray(offset, chunkEnd + 1);

      let attempt = 0;
      let resumed = false;
      const startOffset = offset;

      while (true) {
        // Node 18+ fetch (undici) accepts Buffer at runtime via the
        // TypedArray branch of BodyInit; the DOM lib's BodyInit type
        // doesn't include Buffer directly. Route through an opaque fetch
        // init to satisfy the compiler without referencing DOM globals.
        const init = {
          method: 'PUT',
          headers: {
            'Content-Length': String(slice.byteLength),
            'Content-Range': formatContentRange(offset, chunkEnd, totalBytes),
            // NO Authorization header — T-02-06d (uploadUrl is pre-authenticated).
          },
          body: slice as unknown,
        } as Parameters<typeof fetch>[1];
        const res = await fetch(uploadUrl, init);

        if (res.status === 201 || res.status === 200) {
          // Final chunk — response is the DriveItem body.
          const driveItem = (await res.json()) as DriveItem;
          yield { bytesSent: totalBytes, totalBytes };
          logger.info({ totalBytes }, 'upload complete');
          return driveItem;
        }

        if (res.status === 202) {
          // Intermediate — advance offset via the authoritative
          // nextExpectedRanges; fall back to end-of-chunk + 1 if absent.
          const next = (await res.json().catch(() => ({}))) as {
            nextExpectedRanges?: string[];
          };
          const ranges =
            next.nextExpectedRanges && next.nextExpectedRanges.length > 0
              ? parseNextExpectedRanges(next.nextExpectedRanges)
              : [];
          offset = ranges[0]?.start ?? chunkEnd + 1;
          yield { bytesSent: offset, totalBytes };
          break; // advance outer while
        }

        if (res.status >= 500 || res.status === 416) {
          if (attempt >= MAX_RESUME_ATTEMPTS) {
            // Exhausted resume budget; parse error envelope and throw typed
            // GraphError so the caller can branch on instanceof.
            const body = await res.json().catch(() => ({}));
            throw parseODataError(body, res.status, res.headers);
          }
          attempt++;
          logger.warn(
            { status: res.status, offset, attempt },
            res.status === 416
              ? 'upload 416 — reading authoritative ranges'
              : 'upload 5xx — reading authoritative ranges'
          );
          // GET session URL to get authoritative nextExpectedRanges or, per
          // Graph docs Example 6, the final DriveItem if server already has
          // the full payload.
          const statusRes = await fetch(uploadUrl, { method: 'GET' });
          if (!statusRes.ok) {
            const body = await statusRes.json().catch(() => ({}));
            throw parseODataError(body, statusRes.status, statusRes.headers);
          }
          const statusBody = (await statusRes.json()) as
            | { nextExpectedRanges: string[] }
            | DriveItem;
          // If the status response carries `id`, the upload already completed
          // server-side (race with a previous chunk that the client thought
          // had failed but Graph actually committed).
          if (
            typeof (statusBody as DriveItem).id === 'string' &&
            (statusBody as DriveItem).id.length > 0
          ) {
            const driveItem = statusBody as DriveItem;
            yield { bytesSent: totalBytes, totalBytes };
            logger.info({ totalBytes, recoveredFromStatus: true }, 'upload complete (recovered)');
            return driveItem;
          }
          const ranges = parseNextExpectedRanges(
            (statusBody as { nextExpectedRanges: string[] }).nextExpectedRanges ?? []
          );
          offset = ranges[0]?.start ?? offset;
          resumed = true;
          break; // re-enter outer while to recompute chunkEnd/slice
        }

        // Non-retryable 4xx (e.g., 404 session expired, 400 malformed
        // Content-Range): throw typed GraphError immediately.
        const body = await res.json().catch(() => ({}));
        throw parseODataError(body, res.status, res.headers);
      }

      // Pathological: offset did not advance and we did not resume. Avoid
      // infinite loop by throwing a clear diagnostic error (T-02-06e).
      if (!resumed && offset <= startOffset) {
        throw new Error(`upload offset did not advance (stuck at ${offset}); chunkEnd=${chunkEnd}`);
      }
    }

    // Exited loop because offset >= totalBytes but we never received a
    // 200/201 DriveItem response. Per Graph docs, GET the session URL to
    // commit / fetch the resulting DriveItem envelope.
    const finalRes = await fetch(uploadUrl, { method: 'GET' });
    if (!finalRes.ok) {
      const body = await finalRes.json().catch(() => ({}));
      throw parseODataError(body, finalRes.status, finalRes.headers);
    }
    const finalBody = (await finalRes.json()) as DriveItem;
    yield { bytesSent: totalBytes, totalBytes };
    logger.info({ totalBytes }, 'upload complete (final fetch)');
    return finalBody;
  }
}
