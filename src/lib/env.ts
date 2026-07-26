import logger from '../logger.js';

/**
 * Reads a positive-integer env var, falling back to `defaultValue` when unset, empty, or not a
 * positive integer (logging a warning in that last case so a typo'd env var doesn't silently
 * turn into "no limit" without any trace). Shared by every `MS365_MCP_MAX_*`-style knob
 * (`MS365_MCP_MAX_PAGES`, `MS365_MCP_MAX_ITEMS`, `MS365_MCP_MAX_TOP`,
 * `MS365_MCP_MAX_CONCURRENT_CONVERSIONS`, ...) so they all parse/validate identically.
 */
export function positiveIntFromEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    logger.warn(`Ignoring invalid ${name}=${JSON.stringify(raw)} (use a positive integer)`);
    return defaultValue;
  }
  return n;
}
