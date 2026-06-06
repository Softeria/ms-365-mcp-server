import { describe, expect, it } from 'vitest';
import {
  collectForwardedAuthorizeParams,
  isSameAuthorizeRequest,
} from '../src/lib/oauth/authorize-request-identity.js';
import type { PkceEntry } from '../src/lib/pkce-store/pkce-store.js';

function entry(overrides: Partial<PkceEntry> = {}): PkceEntry {
  return {
    state: 'state-1',
    clientCodeChallenge: 'challenge-1',
    clientCodeChallengeMethod: 'S256',
    serverCodeVerifier: 'server-verifier-1',
    clientId: 'client-1',
    redirectUri: 'https://client.example/callback',
    tenantId: '_',
    createdAt: 1,
    ...overrides,
  };
}

describe('authorize request identity', () => {
  it('collects only forwarded Microsoft authorize parameters', () => {
    const url = new URL(
      'https://mcp.example.com/authorize?' +
        new URLSearchParams({
          response_type: 'code',
          redirect_uri: 'https://client.example/callback',
          scope: 'User.Read Mail.Read',
          state: 'state-1',
          response_mode: 'query',
          prompt: 'select_account',
          login_hint: 'user@example.com',
          domain_hint: 'organizations',
          code_challenge: 'challenge-1',
        })
    );

    expect(collectForwardedAuthorizeParams(url)).toEqual({
      response_type: 'code',
      redirect_uri: 'https://client.example/callback',
      scope: 'User.Read Mail.Read',
      state: 'state-1',
      response_mode: 'query',
      prompt: 'select_account',
      login_hint: 'user@example.com',
      domain_hint: 'organizations',
    });
  });

  it('treats exact duplicate forwarded authorize parameters as same request', () => {
    const forwardedAuthorizeParams = {
      response_type: 'code',
      redirect_uri: 'https://client.example/callback',
      scope: 'User.Read',
      state: 'state-1',
    };
    const existing = entry({ forwardedAuthorizeParams });

    expect(isSameAuthorizeRequest(existing, entry({ forwardedAuthorizeParams }))).toBe(true);
  });

  it('fails closed when duplicate PKCE retry changes forwarded authorize parameters', () => {
    const existing = entry({
      forwardedAuthorizeParams: {
        response_type: 'code',
        redirect_uri: 'https://client.example/callback',
        scope: 'User.Read',
        state: 'state-1',
      },
    });

    const changed = entry({
      forwardedAuthorizeParams: {
        response_type: 'code',
        redirect_uri: 'https://client.example/callback',
        scope: 'Mail.Read',
        state: 'state-1',
      },
    });

    expect(isSameAuthorizeRequest(existing, changed)).toBe(false);
  });

  it('compares duplicate PKCE retry scopes independent of ordering', () => {
    const existing = entry({ scopes: ['Mail.Read', 'User.Read'] });

    expect(isSameAuthorizeRequest(existing, entry({ scopes: ['User.Read', 'Mail.Read'] }))).toBe(
      true
    );
    expect(isSameAuthorizeRequest(existing, entry({ scopes: ['User.Read'] }))).toBe(false);
  });

  it('preserves idempotent retries for older PKCE entries without forwarded authorize params', () => {
    const retry = entry({
      forwardedAuthorizeParams: {
        response_type: 'code',
        redirect_uri: 'https://client.example/callback',
        scope: 'User.Read',
        state: 'state-1',
      },
    });

    expect(isSameAuthorizeRequest(entry(), retry)).toBe(true);
  });
});
