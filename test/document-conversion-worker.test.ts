import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import { truncateMarkdown, type TruncatedMarkdown } from '../src/lib/document-conversion-worker.js';
import type { WorkerOutcome } from '../src/lib/worker-timeout.js';
import { assertNodeVersionSupportsDocumentConversion } from '../src/lib/document-conversion.js';
import { buildXlsxWithText } from './fixtures/build-xlsx.js';

// See test/document-conversion.test.ts for why real-worker tests are skipped below this Node
// version: officeparser's own dependencies (file-type, pdfjs-dist) require Node >=22.13.0, and
// document-conversion.ts's dev/test fallback (loading the worker's raw .ts source when no
// compiled dist/ sibling exists) relies on Node's built-in TypeScript stripping, unavailable
// before that floor either.
const nodeSupportsDocumentConversion = (() => {
  try {
    assertNodeVersionSupportsDocumentConversion();
    return true;
  } catch {
    return false;
  }
})();

const WORKER_PATH = fileURLToPath(
  new URL('../src/lib/document-conversion-worker.ts', import.meta.url)
);

// truncateMarkdown is exported specifically so it can be exercised here in complete isolation,
// with no worker_threads/postMessage involved at all - this is the core logic Codex's review
// flagged as needing to run BEFORE the message crosses the thread boundary, and it is safe to
// import this module directly from the main thread/test process because
// document-conversion-worker.ts only invokes its worker bootstrap (`run()`) when `parentPort` is
// set, which it never is here.
describe('truncateMarkdown (pure function, no worker involved)', () => {
  it('returns markdown unchanged and reports truncated:false when under the cap', () => {
    const result = truncateMarkdown('hello', 10);
    expect(result).toEqual({ markdown: 'hello', truncated: false, totalLength: 5 });
  });

  it('truncates to maxOutputChars and reports the untruncated totalLength when over the cap', () => {
    const result = truncateMarkdown('hello world', 5);
    expect(result.markdown).toBe('hello');
    expect(result.truncated).toBe(true);
    expect(result.totalLength).toBe(11);
  });

  it('treats a string exactly at the cap as not truncated', () => {
    const result = truncateMarkdown('hello', 5);
    expect(result.truncated).toBe(false);
    expect(result.markdown).toBe('hello');
    expect(result.totalLength).toBe(5);
  });

  it('handles an empty string and a zero cap without throwing', () => {
    expect(truncateMarkdown('', 0)).toEqual({ markdown: '', truncated: false, totalLength: 0 });
    expect(truncateMarkdown('x', 0)).toEqual({ markdown: '', truncated: true, totalLength: 1 });
  });
});

describe.skipIf(!nodeSupportsDocumentConversion)(
  'document-conversion-worker.ts (real worker, boundary-crossing proof)',
  () => {
    it(
      'the message received over postMessage is already truncated for a document whose ' +
        'real markdown output is far larger than maxOutputChars',
      async () => {
        // ~138,000 characters of real cell text in a real, valid .xlsx - officeparser expands
        // this into markdown of very close to that same size (see test/fixtures/build-xlsx.ts).
        const bigText = 'The quick brown fox jumps over the lazy dog. '.repeat(3000);
        const xlsxBuffer = buildXlsxWithText(bigText);
        const arrayBuffer = xlsxBuffer.buffer.slice(
          xlsxBuffer.byteOffset,
          xlsxBuffer.byteOffset + xlsxBuffer.byteLength
        ) as ArrayBuffer;
        const maxOutputChars = 50;

        // Talking to the raw worker script directly (bypassing runInWorkerWithTimeout and
        // document-conversion.ts entirely) means the 'message' event handled right here IS the
        // literal object that crossed the postMessage structured-clone boundary - nothing else
        // has touched or re-truncated it. If the fix is working, outcome.value.markdown is
        // already exactly maxOutputChars long by the time we observe it, proving truncation
        // happened worker-side, before the clone, not after.
        const outcome = await new Promise<WorkerOutcome<TruncatedMarkdown>>((resolve, reject) => {
          const worker = new Worker(WORKER_PATH, {
            workerData: { arrayBuffer, ocr: false, maxOutputChars },
            transferList: [arrayBuffer],
          });
          worker.once('message', (message: WorkerOutcome<TruncatedMarkdown>) => {
            void worker.terminate();
            resolve(message);
          });
          worker.once('error', (error) => {
            void worker.terminate();
            reject(error);
          });
        });

        expect(outcome.ok).toBe(true);
        if (!outcome.ok) return;
        expect(outcome.value.markdown).toHaveLength(maxOutputChars);
        expect(outcome.value.truncated).toBe(true);
        // The untruncated length the worker measured before slicing - proof the full markdown
        // really was that large worker-side, not just that the final output happens to be short.
        expect(outcome.value.totalLength).toBeGreaterThan(100_000);

        // What we could NOT directly measure here: the literal byte size V8 allocated for the
        // structured clone on the receiving (main) thread's heap - postMessage/worker_threads
        // expose no hook for that. What this test does prove directly: the payload object
        // handed to the 'message' listener - the only thing that ever crosses that boundary -
        // already has its markdown field capped at maxOutputChars, i.e. truncation happened
        // before postMessage was ever called, not after receipt.
      },
      20_000
    );
  }
);
