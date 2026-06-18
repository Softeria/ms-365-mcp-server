/**
 * Helpers for diagnosing silent stdio crashes. The goal is one log dump per
 * crash that is actually useful: real cause chain, all own properties, and a
 * snapshot of what was keeping the event loop alive.
 */

type ErrorDump = {
  name?: string;
  constructor?: string;
  message?: string;
  stack?: string;
  cause?: unknown;
  properties?: Record<string, unknown>;
};

export function dumpError(reason: unknown, depth = 0): unknown {
  if (depth > 5) {
    return { truncated: true };
  }
  if (reason instanceof Error) {
    const dump: ErrorDump = {
      name: reason.name,
      constructor: reason.constructor?.name,
      message: reason.message,
      stack: reason.stack,
    };
    const properties: Record<string, unknown> = {};
    for (const key of Object.getOwnPropertyNames(reason)) {
      if (key === 'name' || key === 'message' || key === 'stack' || key === 'cause') continue;
      properties[key] = (reason as unknown as Record<string, unknown>)[key];
    }
    if (Object.keys(properties).length > 0) {
      dump.properties = properties;
    }
    if ('cause' in reason && reason.cause !== undefined) {
      dump.cause = dumpError(reason.cause, depth + 1);
    }
    return dump;
  }
  return { type: typeof reason, value: reason };
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
