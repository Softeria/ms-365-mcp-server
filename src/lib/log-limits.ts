// Size bounds for every log file this server writes: each file rotates at
// MS365_MCP_LOG_MAX_BYTES (default 10 MiB) and at most MS365_MCP_LOG_MAX_FILES
// (default 5) are kept per log, oldest dropped.
function boundedInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
export const LOG_MAX_BYTES = boundedInt('MS365_MCP_LOG_MAX_BYTES', 10 * 1024 * 1024);
export const LOG_MAX_FILES = boundedInt('MS365_MCP_LOG_MAX_FILES', 5);
