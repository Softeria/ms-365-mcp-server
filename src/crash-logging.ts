import { describeError, describeStack } from './lib/log-safe.js';

/**
 * Helpers for diagnosing silent stdio crashes. The goal is one log dump per
 * crash that is actually useful: real cause chain, all own properties, and a
 * snapshot of what was keeping the event loop alive.
 */

type ErrorDump = {
  name?: string;
  constructor?: string;
  summary?: string;
  stack?: string[];
  cause?: unknown;
};

export function dumpError(reason: unknown, depth = 0): unknown {
  if (depth > 5) {
    return { truncated: true };
  }
  if (reason instanceof Error) {
    // Name, status/code and code locations only. The message and own properties
    // of an error can carry request or response text, so they are left out.
    const dump: ErrorDump = {
      name: reason.name,
      constructor: reason.constructor?.name,
      summary: describeError(reason),
      stack: describeStack(reason),
    };
    if ('cause' in reason && reason.cause !== undefined) {
      dump.cause = dumpError(reason.cause, depth + 1);
    }
    return dump;
  }
  return { type: typeof reason };
}

export function getActiveResources(): string[] | string {
  const fn = (process as unknown as { getActiveResourcesInfo?: () => string[] })
    .getActiveResourcesInfo;
  if (typeof fn !== 'function') {
    return 'unavailable (node < 17.3)';
  }
  try {
    return fn.call(process);
  } catch (err) {
    return `error: ${(err as Error).message}`;
  }
}
