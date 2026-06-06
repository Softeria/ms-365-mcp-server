export interface OperationKey {
  tenantId?: string;
  requestId?: string;
  progressToken?: string;
}

export interface RegisteredOperation extends Required<OperationKey> {
  controller: AbortController;
  createdAt: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const operations = new Map<string, RegisteredOperation>();

export function operationKey(input: OperationKey): string | undefined {
  if (!input.tenantId || !input.requestId || !input.progressToken) return undefined;
  return JSON.stringify([input.tenantId, input.requestId, input.progressToken]);
}

export function registerOperation(
  input: OperationKey,
  ttlMs: number = DEFAULT_TTL_MS
): AbortController {
  cleanupExpiredOperations(ttlMs);
  const controller = new AbortController();
  const key = operationKey(input);
  if (!key) return controller;
  operations.set(key, {
    tenantId: input.tenantId!,
    requestId: input.requestId!,
    progressToken: input.progressToken!,
    controller,
    createdAt: Date.now(),
  });
  return controller;
}

export function cancelOperation(input: OperationKey): boolean {
  const key = operationKey(input);
  if (!key) return false;
  const operation = operations.get(key);
  if (!operation) return false;
  operation.controller.abort();
  return true;
}

export function unregisterOperation(input: OperationKey): void {
  const key = operationKey(input);
  if (key) operations.delete(key);
}

export function isOperationCancelled(input: OperationKey): boolean {
  const key = operationKey(input);
  if (!key) return false;
  return operations.get(key)?.controller.signal.aborted === true;
}

export function resetOperationsForTesting(): void {
  operations.clear();
}

function cleanupExpiredOperations(ttlMs: number): void {
  const expiresBefore = Date.now() - ttlMs;
  for (const [key, operation] of operations) {
    if (operation.createdAt < expiresBefore || operation.controller.signal.aborted) {
      operations.delete(key);
    }
  }
}
