import { describe, expect, it } from 'vitest';
import {
  effectiveUserFields,
  restrictUserFieldQuery,
  restrictUserFieldUrl,
  targetsUserProfile,
} from '../src/lib/user-field-policy.js';

describe('targetsUserProfile', () => {
  it('matches the users collection and a single user entity', () => {
    expect(targetsUserProfile('/users')).toBe(true);
    expect(targetsUserProfile('/users/')).toBe(true);
    expect(targetsUserProfile('/users/abc-123')).toBe(true);
    expect(targetsUserProfile('/users/someone@example.com')).toBe(true);
  });

  it('matches regardless of query string or leading slash', () => {
    expect(targetsUserProfile('/users?$select=employeeId')).toBe(true);
    expect(targetsUserProfile('users?$select=employeeId')).toBe(true);
  });

  // A user's mail and calendar live under /users/{id}; narrowing a $select of subject and
  // from to a profile allowlist would break every shared-mailbox tool.
  it('does not match resources below a user', () => {
    expect(targetsUserProfile('/users/abc/messages')).toBe(false);
    expect(targetsUserProfile('/users/abc/photo/$value')).toBe(false);
    expect(targetsUserProfile('/me')).toBe(false);
    expect(targetsUserProfile('/groups')).toBe(false);
  });

  // /users/delta returns user objects, so it has to be inside the boundary.
  it('matches the delta function', () => {
    expect(targetsUserProfile('/users/delta')).toBe(true);
  });
});

describe('effectiveUserFields', () => {
  it('keeps the requested fields that are allowed', () => {
    expect(effectiveUserFields(['id', 'jobTitle'], ['id', 'displayName'])).toEqual(['id']);
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

describe('restrictUserFieldQuery', () => {
  it('narrows $select and drops $expand', () => {
    const queryParams: Record<string, string> = {
      $select: 'id,jobTitle',
      $expand: 'manager',
      $top: '10',
    };

    expect(restrictUserFieldQuery(queryParams, ['id', 'displayName'])).toEqual(['id']);
    expect(queryParams).toEqual({ $select: 'id', $top: '10' });
  });

  it('adds the allowlist when no $select was passed', () => {
    const queryParams: Record<string, string> = {};
    restrictUserFieldQuery(queryParams, ['id', 'displayName']);
    expect(queryParams.$select).toBe('id,displayName');
  });
});

describe('restrictUserFieldUrl', () => {
  it('rewrites the $select carried in a batch subrequest URL', () => {
    const { url, fields } = restrictUserFieldUrl('/users?$select=id,employeeId', [
      'id',
      'displayName',
    ]);

    expect(fields).toEqual(['id']);
    expect(url).toBe('/users?$select=id');
  });

  it('keeps other query options and drops $expand', () => {
    const { url } = restrictUserFieldUrl('/users?$top=5&$expand=manager', ['id', 'displayName']);

    expect(url).toContain('$top=5');
    expect(url).toContain('$select=id,displayName');
    expect(url).not.toContain('$expand');
  });

  it('adds a $select to a URL that carried none', () => {
    const { url } = restrictUserFieldUrl('/users', ['id']);
    expect(url).toBe('/users?$select=id');
  });
});
