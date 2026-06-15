import { describe, it, expect } from 'vitest';
import type { ZodTypeAny } from 'zod';

// Node 18 lacks the File global that the generated Zod schemas reference.
// Must be set before the dynamic import below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!globalThis.File) (globalThis as any).File = Blob;

const { api } = await import('../src/generated/client.js');

/**
 * copilot-retrieve declares its body via `requestBodySchema` in endpoints.json
 * (Microsoft only publishes a deprecated/malformed preview op). These guards used
 * to live in a hand-rolled handler; now they ride through the generator, so this
 * test exercises the generated Zod schema to catch a schema-translation regression.
 */
function bodySchema(): ZodTypeAny {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const endpoint = (api as any).endpoints.find((e: any) => e.alias === 'copilot-retrieve');
  expect(endpoint, 'copilot-retrieve must exist in the generated client').toBeDefined();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = endpoint.parameters.find((p: any) => p.name === 'body');
  expect(body, 'copilot-retrieve must take a body param').toBeDefined();
  return body.schema;
}

describe('copilot-retrieve generated body schema', () => {
  it('accepts a minimal valid body', () => {
    const result = bodySchema().safeParse({
      queryString: 'How to setup corporate VPN?',
      dataSource: 'sharePoint',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a whitespace-only queryString (pattern guard)', () => {
    const result = bodySchema().safeParse({ queryString: '   ', dataSource: 'sharePoint' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty queryString (minLength guard)', () => {
    const result = bodySchema().safeParse({ queryString: '', dataSource: 'sharePoint' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid dataSource (enum guard)', () => {
    const result = bodySchema().safeParse({ queryString: 'vpn', dataSource: 'mailbox' });
    expect(result.success).toBe(false);
  });

  it('rejects maximumNumberOfResults outside the 1-25 range', () => {
    expect(
      bodySchema().safeParse({
        queryString: 'vpn',
        dataSource: 'sharePoint',
        maximumNumberOfResults: 50,
      }).success
    ).toBe(false);
    expect(
      bodySchema().safeParse({
        queryString: 'vpn',
        dataSource: 'sharePoint',
        maximumNumberOfResults: 0,
      }).success
    ).toBe(false);
  });

  it('accepts the optional fields when provided correctly', () => {
    const result = bodySchema().safeParse({
      queryString: 'corporate VPN',
      dataSource: 'externalItem',
      filterExpression: 'Author:"Megan Bowen"',
      resourceMetadata: ['title', 'author'],
      maximumNumberOfResults: 5,
    });
    expect(result.success).toBe(true);
  });
});
