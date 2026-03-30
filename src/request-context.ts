import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  accessToken: string;
  refreshToken?: string;
  onTokenRefreshed?: (newRefreshToken: string) => void;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestTokens(): RequestContext | undefined {
  return requestContext.getStore();
}

export function notifyTokenRefreshed(newRefreshToken: string): void {
  const ctx = requestContext.getStore();
  ctx?.onTokenRefreshed?.(newRefreshToken);
}
