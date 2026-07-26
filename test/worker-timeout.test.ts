import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'url';
import { runInWorkerWithTimeout } from '../src/lib/worker-timeout.js';

const FIXTURE_PATH = fileURLToPath(
  new URL('./fixtures/worker-timeout-fixture.js', import.meta.url)
);

describe('runInWorkerWithTimeout', () => {
  it('resolves with the worker-reported value on fast success', async () => {
    const value = await runInWorkerWithTimeout<{ mode: string }, string>({
      workerPath: FIXTURE_PATH,
      workerData: { mode: 'fast-success' },
      timeoutMs: 5000,
    });
    expect(value).toBe('done');
  });

  it('resolves normally when the worker finishes before the deadline', async () => {
    const value = await runInWorkerWithTimeout<{ mode: string; spinMs: number }, string>({
      workerPath: FIXTURE_PATH,
      workerData: { mode: 'spin-then-succeed', spinMs: 50 },
      timeoutMs: 5000,
    });
    expect(value).toBe('finished spinning');
  });

  // This is the real regression test for the defect the whole worker-based redesign exists to
  // fix: a synchronous, non-cooperative loop (no `await` inside it) that runs well past the
  // configured deadline. A cooperative AbortSignal-based timeout cannot interrupt this - the
  // timer callback that would trigger the abort never gets a turn on the event loop until the
  // loop finishes on its own. worker.terminate() can, because it acts at the VM level rather
  // than depending on the worker's own code checking anything. Proven by wall-clock time, not
  // by inspecting internals: if termination is real, this settles close to timeoutMs even
  // though the fixture asks to spin for 10x longer.
  it('terminates a worker spinning synchronously past the timeout, near the deadline rather than the spin duration', async () => {
    const timeoutMs = 300;
    const spinMs = 3000;
    const start = Date.now();

    await expect(
      runInWorkerWithTimeout<{ mode: string; spinMs: number }, string>({
        workerPath: FIXTURE_PATH,
        workerData: { mode: 'spin-then-succeed', spinMs },
        timeoutMs,
      })
    ).rejects.toThrow(/exceeded the 300ms limit/);

    const elapsed = Date.now() - start;
    // Generous tolerance for scheduler/CI jitter, but nowhere near the 3000ms spin duration -
    // if this ever regresses to needing the full spin to complete, elapsed would be ~3000ms+.
    expect(elapsed).toBeLessThan(spinMs / 2);
  }, 10_000);

  it('rejects when the worker reports a handled failure', async () => {
    await expect(
      runInWorkerWithTimeout<{ mode: string }, string>({
        workerPath: FIXTURE_PATH,
        workerData: { mode: 'throw' },
        timeoutMs: 5000,
      })
    ).rejects.toThrow('simulated failure');
  });

  it('preserves errorKind as the rejected Error name, so callers can branch on it', async () => {
    await expect(
      runInWorkerWithTimeout<{ mode: string }, string>({
        workerPath: FIXTURE_PATH,
        workerData: { mode: 'throw' },
        timeoutMs: 5000,
      })
    ).rejects.toMatchObject({ name: 'Simulated' });
  });

  it('rejects when the worker throws uncaught (the error event)', async () => {
    await expect(
      runInWorkerWithTimeout<{ mode: string }, string>({
        workerPath: FIXTURE_PATH,
        workerData: { mode: 'uncaught-throw' },
        timeoutMs: 5000,
      })
    ).rejects.toThrow(/uncaught in worker/);
  });

  it('rejects when the worker exits unexpectedly (the exit event)', async () => {
    await expect(
      runInWorkerWithTimeout<{ mode: string }, string>({
        workerPath: FIXTURE_PATH,
        workerData: { mode: 'exit' },
        timeoutMs: 5000,
      })
    ).rejects.toThrow(/exited unexpectedly with code 7/);
  });

  it('uses the custom describeTimeout message when provided', async () => {
    await expect(
      runInWorkerWithTimeout<{ mode: string; spinMs: number }, string>({
        workerPath: FIXTURE_PATH,
        workerData: { mode: 'spin-then-succeed', spinMs: 2000 },
        timeoutMs: 100,
        describeTimeout: (ms) => `custom message for ${ms}ms`,
      })
    ).rejects.toThrow('custom message for 100ms');
  }, 10_000);
});
