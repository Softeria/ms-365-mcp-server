import { parentPort, workerData } from 'worker_threads';
import type { WorkerOutcome } from './worker-timeout.js';

interface DocumentConversionWorkerData {
  arrayBuffer: ArrayBuffer;
  ocr: boolean;
}

async function run(): Promise<void> {
  if (!parentPort) {
    throw new Error('document-conversion-worker.js must be run inside a worker thread');
  }

  const { arrayBuffer, ocr } = workerData as DocumentConversionWorkerData;
  const buffer = Buffer.from(arrayBuffer);

  let parseOffice: typeof import('officeparser').parseOffice;
  try {
    ({ parseOffice } = await import('officeparser'));
  } catch (error) {
    const outcome: WorkerOutcome<string> = {
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
    const outcome: WorkerOutcome<string> = { ok: true, value: markdown };
    parentPort.postMessage(outcome);
  } catch (error) {
    const outcome: WorkerOutcome<string> = {
      ok: false,
      errorKind: 'DocumentConversionFailed',
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    parentPort.postMessage(outcome);
  }
}

run().catch((error) => {
  // Only reachable if parentPort itself is missing (a misuse of this module, not a
  // conversion failure) — everything past that point already reports through postMessage.
  // eslint-disable-next-line no-console
  console.error(`document-conversion-worker fatal: ${(error as Error).message}`);
  process.exit(1);
});
