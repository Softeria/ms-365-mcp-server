import { redactionEnabled } from './lib/log-redactor.js';
import { describeError, describeStack } from './lib/log-safe.js';

/**
 * Helpers for diagnosing silent stdio crashes. The goal is one log dump per
 * crash that is actually useful: real cause chain, all own properties, and a
 * snapshot of what was keeping the event loop alive.
 */

type ErrorDump = {
  summary?: string;
  stack?: string[];
  cause?: unknown;
};

export function dumpError(reason: unknown, depth = 0): unknown {
  if (depth > 5) {
    return { truncated: true };
  }
  if (!redactionEnabled()) return fullDump(reason, depth);
  if (reason instanceof Error) {
    // Name, status/code and code locations only. The message and own properties
    // of an error can carry request or response text, so they are left out.
    const dump: ErrorDump = {
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

type FullErrorDump = {
  name?: string;
  constructor?: string;
  message?: string;
  stack?: string;
  cause?: unknown;
  properties?: Record<string, unknown>;
};

// MS365_MCP_REDACT_PII=false: message, stack, own properties and cause in full.
function fullDump(reason: unknown, depth: number): unknown {
  if (!(reason instanceof Error)) return { type: typeof reason, value: reason };
  const dump: FullErrorDump = {
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
