import { parentPort, workerData } from 'worker_threads';
import type { WorkerOutcome } from './worker-timeout.js';

interface DocumentConversionWorkerData {
  arrayBuffer: ArrayBuffer;
  ocr: boolean;
  /** Passed in so truncation happens here, before postMessage, rather than after the full
   *  markdown has already been structured-cloned onto the main thread's heap. See
   *  truncateMarkdown below for why that ordering matters. */
  maxOutputChars: number;
}

export interface TruncatedMarkdown {
  markdown: string;
  truncated: boolean;
  totalLength: number;
}

/**
 * Truncate `markdown` to `maxOutputChars`, reporting whether truncation happened and the
 * untruncated length.
 *
 * This MUST run in here, before `parentPort.postMessage(...)`, not after the result arrives back
 * on the main thread (which is where it used to happen, in document-conversion.ts). postMessage's
 * structured clone copies its entire argument onto the receiving thread's heap; truncating only
 * after that copy already ran means the full, untruncated markdown has already been duplicated
 * onto the MAIN process's heap for a document that expands into a huge markdown output - a
 * heavily-repeated-content spreadsheet or similarly pathological-but-not-huge-on-disk document is
 * a realistic way to trigger this, not just a deliberate attack. That defeats the point of
 * capping only this worker's own heap via `resourceLimits.maxOldGenerationSizeMb`: the worker's
 * cap protects the worker, not the main process receiving its message. Truncating here means only
 * the already-bounded string ever crosses the thread boundary.
 *
 * Exported as a small, pure, synchronous function (no worker_threads dependency in its own logic)
 * so it is unit-testable in complete isolation - see test/document-conversion-worker.test.ts.
 * `.length` on a string is O(1) metadata, not a copy, so computing `totalLength` before slicing
 * costs nothing extra.
 */
export function truncateMarkdown(markdown: string, maxOutputChars: number): TruncatedMarkdown {
  const totalLength = markdown.length;
  const truncated = totalLength > maxOutputChars;
  return {
    markdown: truncated ? markdown.slice(0, maxOutputChars) : markdown,
    truncated,
    totalLength,
  };
}

async function run(): Promise<void> {
  if (!parentPort) {
    throw new Error('document-conversion-worker.js must be run inside a worker thread');
  }

  const { arrayBuffer, ocr, maxOutputChars } = workerData as DocumentConversionWorkerData;
  const buffer = Buffer.from(arrayBuffer);

  let parseOffice: typeof import('officeparser').parseOffice;
  try {
    ({ parseOffice } = await import('officeparser'));
  } catch (error) {
    const outcome: WorkerOutcome<TruncatedMarkdown> = {
      ok: false,
      errorKind: 'OfficeParserNotInstalled',
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    parentPort.postMessage(outcome);
    return;
  }

  try {
    const ast = await parseOffice(buffer, { ocr });
    const { value: markdown } = await ast.to('md');
    // Truncate BEFORE postMessage: only the already-bounded result crosses the thread boundary,
    // so a document whose markdown expands far past maxOutputChars never gets its full,
    // untruncated string structured-cloned onto the main process's heap.
    const outcome: WorkerOutcome<TruncatedMarkdown> = {
      ok: true,
      value: truncateMarkdown(markdown, maxOutputChars),
    };
    parentPort.postMessage(outcome);
  } catch (error) {
    const outcome: WorkerOutcome<TruncatedMarkdown> = {
      ok: false,
      errorKind: 'DocumentConversionFailed',
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    parentPort.postMessage(outcome);
  }
}

// Only actually run the worker bootstrap when this module is loaded inside a real worker thread
// (parentPort set). This is what makes it safe for a test to `import` this file directly (see
// test/document-conversion-worker.test.ts) to exercise truncateMarkdown in isolation - without
// this guard, merely importing the module from the main thread (where parentPort is always
// undefined) would hit the `!parentPort` throw below and kill the test process via
// `process.exit(1)`.
if (parentPort) {
  run().catch((error) => {
    // Only reachable if something in run() itself throws past the try/catches above (a bug in
    // this module, not a conversion failure) — everything else already reports through
    // postMessage.
    // eslint-disable-next-line no-console
    console.error(`document-conversion-worker fatal: ${(error as Error).message}`);
    process.exit(1);
  });
}
