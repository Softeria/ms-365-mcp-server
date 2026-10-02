/**
 * The --user-fields allowlist, enforced on the outbound request rather than on a tool name.
 *
 * Keying it to the `list-users` alias left it bypassable: graph-batch forwards arbitrary
 * subrequest URLs, and the byte-passthrough tools forward an arbitrary relative path, so
 * `/users?$select=employeeId` reached Graph without ever touching that tool.
 */

import { parseSelectFields } from './select-projection.js';

/**
 * How far the allowlist can be pushed on a given path.
 *
 * - `request-and-response` narrows the outbound `$select` too, so the restricted fields
 *   never leave the tenant. Only safe where the response is typed as `user`.
 * - `response-only` projects what comes back. The directory navigations return
 *   `directoryObject`, where Graph wants an OData cast before it will `$select` a
 *   user-only property such as jobTitle, so narrowing the request there would risk a 400
 *   on endpoints that work today.
 */
export type UserFieldEnforcement = 'none' | 'request-and-response' | 'response-only';

/**
 * The users collection and a single user entity, and nothing below them. `/users/{id}` is a
 * profile; `/users/{id}/messages` is that mailbox's mail, where a $select of subject and
 * from has nothing to do with this allowlist and narrowing it would break the mail tools.
 */
const USER_ENTITY_PATH = /^\/users(?:\/[^/]+)?\/?$/i;

/**
 * Navigations that hand back other people's profile data: manager and directReports carry
 * displayName, mail and jobTitle, and so do a group's members and owners. Excluding them
 * left the allowlist bypassable by asking for the same fields one hop away.
 *
 * `/me` itself is deliberately absent: that is the caller's own profile, which they already
 * have. `/me/manager` is somebody else's and is covered. The Teams and chat member lists
 * return `conversationMember`, a different resource, and are not covered here.
 *
 * `/me/people` is a known gap. It returns `person`, whose properties only partly overlap
 * with `user` — addresses arrive as scoredEmailAddresses, not mail — so a user-field
 * allowlist applied there would reject valid names and leave the tool unusable. Closing
 * that surface means dropping list-relevant-people from the tool set; see the README.
 */
const DIRECTORY_NAVIGATION_PATH =
  /^(?:\/me|\/users\/[^/]+)\/(?:manager|directReports)\/?$|^\/groups\/[^/]+\/(?:members|owners)\/?$/i;
const EXPAND_USER_PATH = /^\/me\/?$|^\/groups(?:\/[^/]+)?\/?$/i;

function normalizePath(path: string): string {
  const withoutQuery = path.split('?')[0];
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
}

export function userFieldEnforcement(path: string): UserFieldEnforcement {
  const normalized = normalizePath(path);
  if (USER_ENTITY_PATH.test(normalized)) return 'request-and-response';
  if (DIRECTORY_NAVIGATION_PATH.test(normalized)) return 'response-only';
  return 'none';
}

/** Whether the allowlist applies to this path at all, in either mode. */
export function targetsUserProfile(path: string): boolean {
  return userFieldEnforcement(path) !== 'none';
}

export function shouldStripUserFieldExpand(path: string): boolean {
  const normalized = normalizePath(path);
  return userFieldEnforcement(normalized) !== 'none' || EXPAND_USER_PATH.test(normalized);
}

export function stripUserFieldExpandFromUrl(url: string): string {
  const [path, query = ''] = url.split('?');
  if (!shouldStripUserFieldExpand(path) || query === '') return url;
  const params = new URLSearchParams(query);
  if (!params.has('$expand')) return url;
  params.delete('$expand');
  const rebuilt = params.toString();
  if (rebuilt === '') return path;
  return `${path}?${rebuilt.replace(/%24/gi, '$').replace(/%2C/gi, ',')}`;
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
 * Applies the allowlist to a request's query options and returns the fields its response
 * will be projected to. `$expand` goes in both modes: an expanded navigation property
 * arrives in addition to the selected fields and would carry the same profile back in.
 */
export function restrictUserFieldQuery(
  queryParams: Record<string, string>,
  allowlist: string[],
  enforcement: Exclude<UserFieldEnforcement, 'none'>
): string[] {
  const fields = effectiveUserFields(parseSelectFields(queryParams['$select']), allowlist);
  if (enforcement === 'request-and-response') {
    queryParams['$select'] = fields.join(',');
  }
  delete queryParams['$expand'];
  return fields;
}

/** The same restriction applied to a batch subrequest URL, which carries its own query. */
export function restrictUserFieldUrl(
  url: string,
  allowlist: string[],
  enforcement: Exclude<UserFieldEnforcement, 'none'>
): { url: string; fields: string[] } {
  const [path, query = ''] = url.split('?');
  const params = new URLSearchParams(query);
  const fields = effectiveUserFields(
    parseSelectFields(params.get('$select') ?? undefined),
    allowlist
  );
  if (enforcement === 'request-and-response') {
    params.set('$select', fields.join(','));
  }
  params.delete('$expand');
  const rebuilt = params.toString();
  if (rebuilt === '') return { url: path, fields };
  // URLSearchParams percent-encodes the '$' of every OData option and the commas between
  // field names. Graph accepts both forms, but the decoded one is what the rest of this
  // server sends and what anyone reading a batch body or a log would expect to see.
  return { url: `${path}?${rebuilt.replace(/%24/gi, '$').replace(/%2C/gi, ',')}`, fields };
}
