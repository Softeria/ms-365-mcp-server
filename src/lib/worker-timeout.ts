import { Worker, type TransferListItem } from 'worker_threads';
import logger from '../logger.js';

/**
 * Message protocol every worker script driven by runInWorkerWithTimeout must speak: either
 * `{ ok: true, value }` on success, or `{ ok: false, errorKind, errorMessage }` on a handled
 * failure inside the worker. Anything else — an uncaught exception, a crash, an unexpected
 * `process.exit()` — surfaces through the worker's own 'error'/'exit' events instead.
 */
export type WorkerOutcome<TValue> =
  | { ok: true; value: TValue }
  | { ok: false; errorKind: string; errorMessage: string };

export interface RunInWorkerOptions<TData> {
  workerPath: string | URL;
  workerData: TData;
  /** Transferable objects (e.g. an ArrayBuffer) moved rather than copied into the worker. */
  transferList?: readonly TransferListItem[];
  timeoutMs: number;
  /** Caps the worker's own heap, so a pathological document exhausts only its own worker's
   *  budget rather than the main process's. */
  maxOldGenerationSizeMb?: number;
  /** Substituted into the timeout rejection message in place of a generic "N ms" phrase. */
  describeTimeout?: (timeoutMs: number) => string;
}

/**
 * Run a worker to completion or force it to stop at `timeoutMs`, whichever comes first.
 *
 * `worker.terminate()` is a hard kill at the VM level: it does not depend on the worker's own
 * code checking an AbortSignal or otherwise yielding, so it stops even a tight, fully
 * synchronous loop that a cooperative-cancellation timeout cannot interrupt. That distinction
 * is the whole point of routing document conversion through a worker in the first place —
 * some office-document parsers only check for cancellation between loop iterations and never
 * await inside them, so a plain `setTimeout(() => controller.abort())` next to the parse call
 * would never actually get a turn on the event loop until the parse finished on its own.
 */
export function runInWorkerWithTimeout<TData, TValue>(
  options: RunInWorkerOptions<TData>
): Promise<TValue> {
  const { workerPath, workerData, transferList, timeoutMs, maxOldGenerationSizeMb } = options;
  const describeTimeout =
    options.describeTimeout ??
    ((ms: number) => `Operation exceeded the ${ms}ms limit and was terminated.`);

  return new Promise<TValue>((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData,
      transferList: transferList as TransferListItem[] | undefined,
      resourceLimits: maxOldGenerationSizeMb !== undefined ? { maxOldGenerationSizeMb } : undefined,
    });

    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      worker.removeAllListeners();
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      // Await terminate() before rejecting: it resolves only once the worker has actually
      // exited (Node waits for the underlying 'exit' event), not merely once termination has
      // been requested. Rejecting first — as an earlier version of this code did — let the
      // caller's own cleanup (e.g. releasing a concurrency-limit slot in a `finally` block)
      // run while the old worker's up-to-`maxOldGenerationSizeMb` heap was still being torn
      // down, so a new call could pass a concurrency check and spin up another worker before
      // that memory was actually freed. A slow teardown (native parsing or OCR mid-flight)
      // widens that window rather than closing it.
      worker
        .terminate()
        .catch((err) => {
          logger.warn(
            `Worker termination after timeout raised its own error: ${(err as Error).message}`
          );
        })
        .finally(() => {
          reject(new Error(describeTimeout(timeoutMs)));
        });
    }, timeoutMs);

    worker.once('message', (outcome: WorkerOutcome<TValue>) => {
      if (settled) return;
      settled = true;
      cleanup();
      void worker.terminate();
      if (outcome.ok) {
        resolve(outcome.value);
      } else {
        const error = new Error(outcome.errorMessage);
        error.name = outcome.errorKind;
        reject(error);
      }
    });

    worker.once('error', (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    });

    worker.once('exit', (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`Worker exited unexpectedly with code ${code} before reporting a result.`));
    });
  });
}
