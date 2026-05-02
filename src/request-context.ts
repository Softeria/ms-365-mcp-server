import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  accessToken: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestTokens(): RequestContext | undefined {
  return requestContext.getStore();
}
