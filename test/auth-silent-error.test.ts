import { describe, it, expect } from 'vitest';
import { AuthError } from '@azure/msal-node';
import { describeAuthError } from '../src/auth.js';

describe('describeAuthError', () => {
  it('summarises an MSAL AuthError with code, suberror and correlation id', () => {
    const error = new AuthError('invalid_grant', 'AADSTS70000: the grant is expired', 'bad_token');
    error.correlationId = 'abc-123';

    const summary = describeAuthError(error);

    expect(summary).toContain('invalid_grant');
    expect(summary).toContain('bad_token');
    expect(summary).toContain('abc-123');
    expect(summary).toContain('AADSTS70000');
  });

  it('omits the suberror segment when the AuthError has none', () => {
    const error = new AuthError('interaction_required', 'sign in again');

    const summary = describeAuthError(error);

    expect(summary).toContain('interaction_required');
    expect(summary).not.toContain(' / ');
  });

  it('falls back to the plain message for non-AuthError values', () => {
    expect(describeAuthError(new Error('socket hang up'))).toBe('socket hang up');
  });
});
