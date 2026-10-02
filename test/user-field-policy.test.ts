import { describe, expect, it } from 'vitest';
import {
  effectiveUserFields,
  restrictUserFieldQuery,
  restrictUserFieldUrl,
  shouldStripUserFieldExpand,
  stripUserFieldExpandFromUrl,
  targetsUserProfile,
  userFieldEnforcement,
} from '../src/lib/user-field-policy.js';

describe('userFieldEnforcement', () => {
  it('narrows the request on paths typed as user', () => {
    expect(userFieldEnforcement('/users')).toBe('request-and-response');
    expect(userFieldEnforcement('/users/')).toBe('request-and-response');
    expect(userFieldEnforcement('/users/abc-123')).toBe('request-and-response');
    expect(userFieldEnforcement('/users/someone@example.com')).toBe('request-and-response');
    expect(userFieldEnforcement('/users/delta')).toBe('request-and-response');
  });

  // These carry displayName, mail and jobTitle for other people, but are typed as
  // directoryObject, where a user-only $select needs an OData cast.
  it('projects the response on the directory navigations', () => {
    expect(userFieldEnforcement('/me/manager')).toBe('response-only');
    expect(userFieldEnforcement('/me/directReports')).toBe('response-only');
    expect(userFieldEnforcement('/users/abc/manager')).toBe('response-only');
    expect(userFieldEnforcement('/users/abc/directReports')).toBe('response-only');
    expect(userFieldEnforcement('/groups/g1/members')).toBe('response-only');
    expect(userFieldEnforcement('/groups/g1/owners')).toBe('response-only');
  });

  it('leaves everything else alone', () => {
    expect(userFieldEnforcement('/users/abc/messages')).toBe('none');
    expect(userFieldEnforcement('/users/abc/photo/$value')).toBe('none');
    expect(userFieldEnforcement('/users/abc/calendarView')).toBe('none');
    // The caller's own profile, which they already have.
    expect(userFieldEnforcement('/me')).toBe('none');
    // A reference collection returns @odata.id strings, not profiles.
    expect(userFieldEnforcement('/groups/g1/members/$ref')).toBe('none');
    // conversationMember, not user.
    expect(userFieldEnforcement('/teams/t1/members')).toBe('none');
    expect(userFieldEnforcement('/chats/c1/members')).toBe('none');
    expect(userFieldEnforcement('/groups')).toBe('none');
  });
});

describe('targetsUserProfile', () => {
  it('is true in either enforcement mode', () => {
    expect(targetsUserProfile('/users')).toBe(true);
    expect(targetsUserProfile('/me/manager')).toBe(true);
  });

  it('matches regardless of query string or leading slash', () => {
    expect(targetsUserProfile('/users?$select=employeeId')).toBe(true);
    expect(targetsUserProfile('users?$select=employeeId')).toBe(true);
  });

  it('is false below a user and for unrelated resources', () => {
    expect(targetsUserProfile('/users/abc/messages')).toBe(false);
    expect(targetsUserProfile('/me')).toBe(false);
  });

  it('matches case-insensitively', () => {
    expect(effectiveUserFields(['DisplayName'], ['displayName'])).toEqual(['DisplayName']);
  });

  // Graph rejects an empty $select, and an empty projection set is a no-op.
  it('falls back to the whole allowlist when nothing requested is allowed', () => {
    expect(effectiveUserFields(['jobTitle'], ['id', 'displayName'])).toEqual(['id', 'displayName']);
    expect(effectiveUserFields([], ['id'])).toEqual(['id']);
  });
});

describe('user-field expansion restrictions', () => {
  it.each(['/me', '/groups', '/groups/g1'])(
    'strips $expand from %s while the boundary is active',
    (path) => {
      expect(shouldStripUserFieldExpand(path)).toBe(true);
    }
  );

  it('does not broaden the strip rule to unrelated resources', () => {
    expect(shouldStripUserFieldExpand('/me/messages')).toBe(false);
    expect(shouldStripUserFieldExpand('/groups/g1/members/$ref')).toBe(false);
    expect(shouldStripUserFieldExpand('/teams/t1')).toBe(false);
  });

  it('removes expand from generic batch URLs without changing their other query options', () => {
    expect(stripUserFieldExpandFromUrl('/me?$expand=manager($select=jobTitle)&$select=id')).toBe(
      '/me?$select=id'
    );
    expect(stripUserFieldExpandFromUrl('/groups/g1?$expand=members($select=mail)&$top=5')).toBe(
      '/groups/g1?$top=5'
    );
  });
});

describe('restrictUserFieldQuery', () => {
  it('narrows $select and drops $expand', () => {
    const queryParams: Record<string, string> = {
      $select: 'id,jobTitle',
      $expand: 'manager',
      $top: '10',
    };

    expect(
      restrictUserFieldQuery(queryParams, ['id', 'displayName'], 'request-and-response')
    ).toEqual(['id']);
    expect(queryParams).toEqual({ $select: 'id', $top: '10' });
  });

  it('adds the allowlist when no $select was passed', () => {
    const queryParams: Record<string, string> = {};
    restrictUserFieldQuery(queryParams, ['id', 'displayName'], 'request-and-response');
    expect(queryParams.$select).toBe('id,displayName');
  });

  // Graph needs an OData cast before it will $select a user-only property off a
  // directoryObject, so the request is left alone and the response carries the boundary.
  it('leaves $select alone in response-only mode but still drops $expand', () => {
    const queryParams: Record<string, string> = { $select: 'id,jobTitle', $expand: 'manager' };

    expect(restrictUserFieldQuery(queryParams, ['id', 'displayName'], 'response-only')).toEqual([
      'id',
    ]);
    expect(queryParams).toEqual({ $select: 'id,jobTitle' });
  });
});

describe('restrictUserFieldUrl', () => {
  it('rewrites the $select carried in a batch subrequest URL', () => {
    const { url, fields } = restrictUserFieldUrl(
      '/users?$select=id,employeeId',
      ['id', 'displayName'],
      'request-and-response'
    );

    expect(fields).toEqual(['id']);
    expect(url).toBe('/users?$select=id');
  });

  it('keeps other query options and drops $expand', () => {
    const { url } = restrictUserFieldUrl(
      '/users?$top=5&$expand=manager',
      ['id', 'displayName'],
      'request-and-response'
    );

    expect(url).toContain('$top=5');
    expect(url).toContain('$select=id,displayName');
    expect(url).not.toContain('$expand');
  });

  it('adds a $select to a URL that carried none', () => {
    const { url } = restrictUserFieldUrl('/users', ['id'], 'request-and-response');
    expect(url).toBe('/users?$select=id');
  });

  it('leaves a response-only URL untouched when it has no query to strip', () => {
    const { url, fields } = restrictUserFieldUrl(
      '/me/manager',
      ['id', 'displayName'],
      'response-only'
    );

    expect(url).toBe('/me/manager');
    expect(fields).toEqual(['id', 'displayName']);
  });
});
