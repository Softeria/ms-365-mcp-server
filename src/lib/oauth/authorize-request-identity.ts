import type { PkceEntry } from '../pkce-store/pkce-store.js';

export const LEGACY_FORWARDED_AUTHORIZE_PARAMS = [
  'response_type',
  'redirect_uri',
  'scope',
  'state',
  'response_mode',
  'prompt',
  'login_hint',
  'domain_hint',
] as const;

export type AuthorizeRequestIdentity = Pick<
  PkceEntry,
  | 'state'
  | 'clientCodeChallenge'
  | 'clientCodeChallengeMethod'
  | 'clientId'
  | 'redirectUri'
  | 'tenantId'
  | 'forwardedAuthorizeParams'
>;

function forwardedParamsMatch(
  left?: Readonly<Record<string, string>>,
  right?: Readonly<Record<string, string>>
): boolean {
  if (left === undefined || right === undefined) return true;

  const leftEntries = Object.entries(left);
  if (leftEntries.length !== Object.keys(right).length) return false;
  return leftEntries.every(([key, value]) => right[key] === value);
}

export function isSameAuthorizeRequest(
  entry: PkceEntry,
  expected: AuthorizeRequestIdentity
): boolean {
  return (
    entry.state === expected.state &&
    entry.clientCodeChallenge === expected.clientCodeChallenge &&
    entry.clientCodeChallengeMethod === expected.clientCodeChallengeMethod &&
    entry.clientId === expected.clientId &&
    entry.redirectUri === expected.redirectUri &&
    entry.tenantId === expected.tenantId &&
    forwardedParamsMatch(entry.forwardedAuthorizeParams, expected.forwardedAuthorizeParams)
  );
}

export function collectForwardedAuthorizeParams(
  url: URL,
  params: readonly string[] = LEGACY_FORWARDED_AUTHORIZE_PARAMS
): Record<string, string> {
  const forwarded: Record<string, string> = {};
  for (const param of params) {
    const value = url.searchParams.get(param);
    if (value) forwarded[param] = value;
  }
  return forwarded;
}
