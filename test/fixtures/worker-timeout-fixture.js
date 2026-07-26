// Plain JS worker script, not compiled from TypeScript: it must run as a real, standalone
// worker_threads.Worker, in a separate module realm untouched by vitest's own module mocking.
import { parentPort, workerData } from 'worker_threads';

const { mode } = workerData;

function busySpinMs(ms) {
  // Deliberately synchronous with no await inside the loop, mirroring the real defect this
  // fixture exists to catch: officeparser's Excel/Word/PowerPoint parsers only check for
  // cancellation between loop iterations, never inside an awaited gap, so a cooperative
  // AbortSignal-based timeout never gets a turn on the event loop until a loop like this one
  // finishes on its own.
  const until = Date.now() + ms;
  let x = 0;
  while (Date.now() < until) {
    x += 1;
  }
  return x;
}

if (mode === 'fast-success') {
  parentPort.postMessage({ ok: true, value: 'done' });
} else if (mode === 'spin-then-succeed') {
  busySpinMs(workerData.spinMs);
  parentPort.postMessage({ ok: true, value: 'finished spinning' });
} else if (mode === 'throw') {
  parentPort.postMessage({ ok: false, errorKind: 'Simulated', errorMessage: 'simulated failure' });
} else if (mode === 'uncaught-throw') {
  throw new Error('uncaught in worker');
} else if (mode === 'exit') {
  process.exit(7);
} else {
  parentPort.postMessage({
    ok: false,
    errorKind: 'BadFixture',
    errorMessage: `unknown mode ${mode}`,
  });
}
