import type { Mock } from 'vitest';
import GraphClient from '../src/graph-client.js';

/**
 * Mock GraphClient for request-building tests. Tools with a `shape` read Graph
 * through `makeRequest` + `formatJsonResponse`; others through `graphRequest`.
 * Both route through the one `graphRequest` spy so call assertions see every
 * request, and `makeRequest` unwraps the spy's `{ content: [{ text }] }`
 * envelope the way the real client parses a Graph body.
 */
export function fakeGraphClient(graphRequest: Mock): GraphClient {
  const real = new GraphClient();
  return {
    format: 'json',
    graphRequest,
    makeRequest: async (path: string, options: unknown) => {
      const response = await graphRequest(path, options);
      const text = response?.content?.[0]?.text;
      if (response?.isError) throw new Error(text);
      if (typeof text !== 'string') return response;
      if (text === '') return { message: 'OK!' };
      try {
        return JSON.parse(text);
      } catch {
        return { message: 'OK!', rawResponse: text };
      }
    },
    formatJsonResponse: real.formatJsonResponse.bind(real),
  } as unknown as GraphClient;
}
