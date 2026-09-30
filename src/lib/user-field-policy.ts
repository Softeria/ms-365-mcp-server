/**
 * The --user-fields allowlist, enforced on the outbound request rather than on a tool name.
 *
 * Keying it to the `list-users` alias left it bypassable: graph-batch forwards arbitrary
 * subrequest URLs, and the byte-passthrough tools forward an arbitrary relative path, so
 * `/users?$select=employeeId` reached Graph without ever touching that tool.
 */

import { parseSelectFields } from './select-projection.js';

/**
 * The users collection and a single user entity, and nothing below them. `/users/{id}` is a
 * profile; `/users/{id}/messages` is that mailbox's mail, where a $select of subject and
 * from has nothing to do with this allowlist and narrowing it would break the mail tools.
 */
const USER_PROFILE_PATH = /^\/users(\/[^/]+)?\/?$/i;

export function targetsUserProfile(path: string): boolean {
  const withoutQuery = path.split('?')[0];
  const normalized = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  return USER_PROFILE_PATH.test(normalized);
}

/**
 * The allowlisted subset of what was asked for, or the whole allowlist when the request
 * named none of it. Never empty: Graph rejects `$select=`, and an empty projection set is
 * a no-op, which is the one outcome this must not produce.
 */
export function effectiveUserFields(requestedSelect: string[], allowlist: string[]): string[] {
  const allowed = requestedSelect.filter((field) =>
    allowlist.some((entry) => entry.toLowerCase() === field.toLowerCase())
  );
  return allowed.length > 0 ? allowed : allowlist;
}

/**
 * Narrows `$select` to the allowlist and drops `$expand`, which would otherwise pull the
 * same profile data back in through a related resource.
 */
export function restrictUserFieldQuery(
  queryParams: Record<string, string>,
  allowlist: string[]
): string[] {
  const fields = effectiveUserFields(parseSelectFields(queryParams['$select']), allowlist);
  queryParams['$select'] = fields.join(',');
  delete queryParams['$expand'];
  return fields;
}

/** The same restriction applied to a batch subrequest URL, which carries its own query. */
export function restrictUserFieldUrl(
  url: string,
  allowlist: string[]
): { url: string; fields: string[] } {
  const [path, query = ''] = url.split('?');
  const params = new URLSearchParams(query);
  const fields = effectiveUserFields(
    parseSelectFields(params.get('$select') ?? undefined),
    allowlist
  );
  params.set('$select', fields.join(','));
  params.delete('$expand');
  // URLSearchParams percent-encodes the '$' of every OData option and the commas between
  // field names. Graph accepts both forms, but the decoded one is what the rest of this
  // server sends and what anyone reading a batch body or a log would expect to see.
  const rebuilt = params.toString().replace(/%24/gi, '$').replace(/%2C/gi, ',');
  return { url: `${path}?${rebuilt}`, fields };
}
