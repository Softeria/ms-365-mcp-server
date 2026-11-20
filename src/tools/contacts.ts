import { z } from 'zod';
import { OData, type Tool } from './types.js';
import { isSafePathSegment, requireSafePathSegment } from './graph-path.js';
import { compact } from './shapes.js';

/**
 * Microsoft Graph's `user-list-contacts` doc
 * (https://learn.microsoft.com/en-us/graph/api/user-list-contacts) documents
 * exactly one `$filter` example for contacts: `eq` on the `address`
 * sub-property of an `emailAddresses` entry via `any()`. That page does not
 * establish other operators or properties (e.g. `displayName`) as
 * unsupported — only that they aren't documented; treat them as unverified,
 * not confirmed-impossible, and expect a Graph error if you try them. It
 * also documents no `$search` support for contacts (unlike mail/users), so
 * this tool promises none. Do not copy the shared `OData.filter`/
 * `OData.search` descriptions here; they describe mail/user capabilities not
 * documented for this endpoint.
 */
const CONTACTS_FILTER_TIP =
  'The only $filter form Microsoft Graph documents for contacts is an example on the emailAddresses ' +
  "collection: emailAddresses/any(a:a/address eq 'someone@example.com') — eq only, on the address " +
  'sub-property. Other operators (startswith()/ne/le/etc.) or other properties (e.g. displayName) are ' +
  'not documented as supported on this endpoint — treat them as unverified, not confirmed unsupported, ' +
  'and expect a Graph error if you try them. There is no documented $search support for contacts (unlike ' +
  'mail/users) — for name lookups, list and scan client-side, or narrow with $orderby + a tight top.';

const contactFilterParam = {
  name: 'filter',
  location: 'query' as const,
  schema: z.string().describe(CONTACTS_FILTER_TIP).optional(),
};

/**
 * Custom top/orderby/select params instead of the shared `OData.*` set: the
 * shared `OData.top` description tells callers to use `@odata.nextLink` for
 * further pages, which these tools strip and replace with an opaque
 * `cursor` — reusing that description here would contradict the actual
 * pagination contract.
 */
const contactsTopParam = {
  name: 'top',
  location: 'query' as const,
  schema: z
    .number()
    .describe(
      'Page size for this call only ($top). Start small (e.g. 15-50) so a page fits the context budget. ' +
        "For further pages, pass back the `cursor` this tool's response returns — do not request a very large top."
    )
    .optional(),
};

const CONTACTS_PAGING_TIP =
  'Every response reports hasMore and, when true, cursor — an opaque token this tool issued. Pass cursor ' +
  "back verbatim (as this tool's cursor param) to continue; stop once hasMore is false. Do not construct, " +
  'edit, or reuse a cursor from a different call, folder, or session — it is bound to the exact tool, folder ' +
  'scope, and caller that requested it and will be refused otherwise. Other paging/filter params are ignored ' +
  'once cursor is supplied. fetchAllPages is not supported on this tool. Pagination is not a frozen snapshot: ' +
  "if contacts are added, deleted, or reordered in this folder while you're paginating, a row could " +
  'occasionally be skipped or duplicated near the edit — the same limitation any offset-based Graph paging has.';

/**
 * Read-only Outlook contacts surface: compact business-card listing, full
 * contact detail (personalNotes/categories reachable by explicit selection,
 * not gated behind a separate tool), and complete nested contact-folder
 * discovery. No writes, no delta/sync engine — see docs/DEPLOYMENT.md and
 * README.md for the Contacts.Read Entra scope.
 */
export const contactsTools: readonly Tool[] = [
  {
    name: 'contact-list',
    description:
      "List the signed-in user's contacts. Pass folder-id to scope to one contact folder, at any " +
      'nesting depth (discover ids with contact-folder-list); omit to list the default Contacts folder.',
    method: 'GET',
    path: '/me/contacts',
    scopes: ['Contacts.Read'],
    projection: 'contact',
    cursorPagination: true,
    resolverParams: ['folder-id'],
    pathResolver: (p) => {
      if (p['folder-id'] === undefined) return '/me/contacts';
      if (typeof p['folder-id'] !== 'string') throw new Error('folder-id must be a string');
      return `/me/contactFolders/${requireSafePathSegment(p['folder-id'], 'folder-id')}/contacts`;
    },
    params: [
      {
        name: 'folder-id',
        location: 'query',
        schema: z
          .string()
          .refine(isSafePathSegment, {
            message:
              "must be a single opaque id — not empty, not '.'/'..', and without '/' or '\\'",
          })
          .describe(
            'Optional contact folder id (from contact-folder-list), at any nesting depth. Omit to list the default Contacts folder.'
          )
          .optional(),
      },
      contactFilterParam,
      OData.select,
      OData.orderby,
      contactsTopParam,
      OData.skip,
    ],
    llmTip: CONTACTS_PAGING_TIP,
  },
  {
    name: 'contact-get',
    description:
      'Get a single contact by id, including fields the compact contact-list omits by default — ' +
      'personalNotes plus every other Graph contact property. Pass folder-id when the contact is outside ' +
      'the default Contacts folder (from contact-list/contact-folder-list), at any nesting depth.',
    method: 'GET',
    path: '/me/contacts/{contact-id}',
    scopes: ['Contacts.Read'],
    // Detail read: every populated property, minus Graph bookkeeping and empty fields.
    shape: compact,
    resolverParams: ['folder-id', 'contact-id'],
    pathResolver: (p) => {
      if (typeof p['contact-id'] !== 'string')
        throw new Error('contact-id is required and must be a string');
      const contactId = requireSafePathSegment(p['contact-id'], 'contact-id');
      if (p['folder-id'] === undefined) return `/me/contacts/${contactId}`;
      if (typeof p['folder-id'] !== 'string') throw new Error('folder-id must be a string');
      return `/me/contactFolders/${requireSafePathSegment(p['folder-id'], 'folder-id')}/contacts/${contactId}`;
    },
    params: [
      {
        name: 'contact-id',
        location: 'path',
        schema: z
          .string()
          .refine(isSafePathSegment, {
            message:
              "must be a single opaque id — not empty, not '.'/'..', and without '/' or '\\'",
          })
          .describe('Contact id (from contact-list)'),
      },
      {
        name: 'folder-id',
        location: 'query',
        schema: z
          .string()
          .refine(isSafePathSegment, {
            message:
              "must be a single opaque id — not empty, not '.'/'..', and without '/' or '\\'",
          })
          .describe(
            'Optional contact folder id the contact lives in, at any nesting depth — only needed for contacts outside the default Contacts folder.'
          )
          .optional(),
      },
      OData.select,
      OData.expand,
    ],
    llmTip:
      'personalNotes and categories are private per-user annotations the signed-in user attached to this ' +
      'contact — treat them as sensitive; do not forward them outside the requesting context without reason. ' +
      "They are omitted from contact-list's default compact fields but are not gated behind this tool: an " +
      "explicit $select=personalNotes (or response_format: 'detailed') on contact-list also returns them, for " +
      'any caller already allowed to call contact-list.',
  },
  {
    name: 'contact-folder-list',
    description:
      "List the signed-in user's contact folders. Omit parent-folder-id for the top-level folders; " +
      'pass a folder id to list its child folders (contact folders can nest) — walk the tree one ' +
      'level at a time to discover every folder.',
    method: 'GET',
    path: '/me/contactFolders',
    scopes: ['Contacts.Read'],
    cursorPagination: true,
    resolverParams: ['parent-folder-id'],
    pathResolver: (p) => {
      if (p['parent-folder-id'] === undefined) return '/me/contactFolders';
      if (typeof p['parent-folder-id'] !== 'string')
        throw new Error('parent-folder-id must be a string');
      return `/me/contactFolders/${requireSafePathSegment(p['parent-folder-id'], 'parent-folder-id')}/childFolders`;
    },
    params: [
      {
        name: 'parent-folder-id',
        location: 'query',
        schema: z
          .string()
          .refine(isSafePathSegment, {
            message:
              "must be a single opaque id — not empty, not '.'/'..', and without '/' or '\\'",
          })
          .describe(
            'Optional parent contact folder id. Omit to list top-level folders; pass a folder id to list its child folders.'
          )
          .optional(),
      },
      OData.select,
      OData.orderby,
      contactsTopParam,
      OData.skip,
    ],
    llmTip: CONTACTS_PAGING_TIP,
  },
];
