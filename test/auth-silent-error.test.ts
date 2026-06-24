import type { AccountInfo, Configuration } from '@azure/msal-node';
import { describe, it, expect, vi } from 'vitest';
import { AuthError } from '@azure/msal-node';
import AuthManager, { consumersAuthorityHint, describeAuthError } from '../src/auth.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const MSA_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';
const COMMON_AUTHORITY = 'https://login.microsoftonline.com/common';

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

describe('consumersAuthorityHint', () => {
  function msaAccount(tenantId: string = MSA_TENANT): AccountInfo {
    return { tenantId } as AccountInfo;
  }

  // No subError on purpose: the guard must key on errorCode alone, because
  // real-world invalid_grant responses do not always carry one.
  function invalidGrant(): AuthError {
    return new AuthError('invalid_grant', 'AADSTS70000: the grant is expired');
  }

  it('suggests the consumers authority for an MSA invalid_grant on common', () => {
    const hint = consumersAuthorityHint(invalidGrant(), msaAccount(), COMMON_AUTHORITY);

    expect(hint).toContain('MS365_MCP_TENANT_ID=consumers');
    expect(hint).toContain('--login');
  });

  it('treats the authority as common when cased differently or absent', () => {
    expect(
      consumersAuthorityHint(
        invalidGrant(),
        msaAccount(),
        'https://login.microsoftonline.com/Common'
      )
    ).not.toBeNull();
    // MSAL itself defaults a missing authority to common.
    expect(consumersAuthorityHint(invalidGrant(), msaAccount(), undefined)).not.toBeNull();
  });

  it('only matches the common tenant segment exactly', () => {
    for (const tenant of ['commonish', 'organizations', 'consumers']) {
      expect(
        consumersAuthorityHint(
          invalidGrant(),
          msaAccount(),
          `https://login.microsoftonline.com/${tenant}`
        )
      ).toBeNull();
    }
  });

  it('returns null for a work or school account', () => {
    const workTenant = '11111111-1111-1111-1111-111111111111';

    expect(
      consumersAuthorityHint(invalidGrant(), msaAccount(workTenant), COMMON_AUTHORITY)
    ).toBeNull();
  });

  it('returns null for other error codes, non-AuthError values and missing accounts', () => {
    expect(
      consumersAuthorityHint(
        new AuthError('no_tokens_found', 'no cached tokens'),
        msaAccount(),
        COMMON_AUTHORITY
      )
    ).toBeNull();
    expect(
      consumersAuthorityHint(new Error('socket hang up'), msaAccount(), COMMON_AUTHORITY)
    ).toBeNull();
    expect(consumersAuthorityHint(invalidGrant(), null, COMMON_AUTHORITY)).toBeNull();
  });
});

describe('silent failure hints at the call sites', () => {
  const msalConfig: Configuration = {
    auth: {
      clientId: 'test-client',
      authority: COMMON_AUTHORITY,
    },
  };

  const msaAccount = {
    username: 'personal@example.com',
    name: 'Personal User',
    homeAccountId: 'personal.home',
    tenantId: MSA_TENANT,
  } as AccountInfo;

  function createAuth() {
    const tokenCache = {
      getAllAccounts: vi.fn().mockResolvedValue([msaAccount]),
      removeAccount: vi.fn().mockResolvedValue(undefined),
    };
    const msalApp = {
      getTokenCache: vi.fn(() => tokenCache),
      acquireTokenSilent: vi
        .fn()
        .mockRejectedValue(
          new AuthError('invalid_grant', 'AADSTS70000: the grant is expired', 'bad_token')
        ),
    };
    const auth = new AuthManager(msalConfig, ['User.Read']);

    Object.assign(auth as unknown as Record<string, unknown>, {
      msalApp,
      saveSelectedAccount: vi.fn(),
    });

    return auth;
  }

  it('getToken appends the consumers hint to the generic failure', async () => {
    await expect(createAuth().getToken()).rejects.toThrow(
      /Silent token acquisition failed\. This looks like a known issue/
    );
  });

  it('getTokenForAccount replaces the generic re-login advice with the hint', async () => {
    await expect(createAuth().getTokenForAccount()).rejects.toThrow(
      /personal@example\.com'\. This looks like a known issue/
    );
  });
});
