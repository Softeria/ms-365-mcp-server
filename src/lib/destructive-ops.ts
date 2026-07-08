/**
 * Shared classification of Graph operations as destructive vs read-only.
 * Lives in `src/lib/` so it can be imported by both `graph-tools.ts` (which
 * enforces the confirm gate at execution time) and `lib/tool-schema.ts`
 * (which surfaces the `confirm` parameter in discovery-mode schemas).
 */

/** Minimal subset of EndpointConfig needed to classify destructiveness. */
export interface DestructiveCheckConfig {
  readOnly?: boolean;
}

/**
 * A Graph operation is destructive when the HTTP method mutates server state.
 * POST endpoints flagged `readOnly` in endpoints.json (e.g. get-schedule,
 * find-meeting-times) are treated as non-destructive because they are queries
 * dressed as POST for body-based parameters.
 */
export function isDestructiveOperation(
  method: string,
  config: DestructiveCheckConfig | undefined
): boolean {
  const upper = method.toUpperCase();
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(upper)) return false;
  if (upper === 'POST' && config?.readOnly) return false;
  return true;
}
