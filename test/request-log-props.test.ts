import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { requestLogProps } from '../src/lib/request-log-props.js';

describe('requestLogProps', () => {
  it('binds only stable request identifiers before tenant middleware runs', () => {
    const req = {
      id: 'req-123',
      tenant: {
        id: 'tenant-abc',
        client_secret_ref: 'secret-ref-must-not-log',
        wrapped_dek: { ciphertext: 'encrypted-key-must-not-log' },
      },
      headers: { authorization: 'Bearer token-must-not-log' },
      body: { client_secret: 'body-secret-must-not-log' },
    } as unknown as Request;

    const props = requestLogProps(req);

    expect(props).toEqual({ requestId: 'req-123' });
    expect(Object.keys(props)).toEqual(['requestId']);
  });

  it('does not rebind tenantId from mutable request state', () => {
    const props = requestLogProps({
      id: 'req-456',
      tenant: { id: 'tenant-late' },
    } as unknown as Request);

    expect(props).toEqual({ requestId: 'req-456' });
    expect(Object.hasOwn(props, 'tenantId')).toBe(false);
  });

  it('omits requestId for non-string or empty identifiers', () => {
    expect(requestLogProps({ id: 123, tenant: { id: '' } } as unknown as Request)).toEqual({
      requestId: null,
    });
    expect(requestLogProps({ id: '', tenant: { id: '' } } as unknown as Request)).toEqual({
      requestId: null,
    });
  });
});
