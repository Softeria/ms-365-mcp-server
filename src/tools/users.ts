import { z } from 'zod';
import { OData, type Tool } from './types.js';
import { compact, listShape } from './shapes.js';

const USER_SELECT_TIP =
  'Default fields: id, displayName, userPrincipalName, mail, jobTitle, department. Pass select for ' +
  'others (e.g. officeLocation,businessPhones) or response_format: "detailed" for the full object.';

/** person → id, name, addresses, role, company, and kind (OrganizationUser, PersonalContact, …). */
const shapePeople = listShape((raw) => {
  const p = raw as {
    id?: string;
    displayName?: string;
    scoredEmailAddresses?: { address?: string }[];
    jobTitle?: string;
    companyName?: string;
    personType?: { subclass?: string };
  };
  return compact({
    id: p.id,
    displayName: p.displayName,
    emails: p.scoredEmailAddresses?.map((e) => e.address),
    jobTitle: p.jobTitle,
    companyName: p.companyName,
    type: p.personType?.subclass,
  });
});

const USER_SEARCH_TIP =
  '$search on /users uses property-scoped syntax: $search="displayName:Spencer" or ' +
  '$search="mail:@areteintelligence.com". Multiple terms can be AND/OR\'d. ' +
  'The ConsistencyLevel: eventual header is set automatically by this tool — no need to pass it.';

export const usersTools: readonly Tool[] = [
  {
    name: 'user-search',
    description:
      'List or search users in the tenant. Use this to resolve a display name to a userPrincipalName / Entra object id before referencing the user in mail recipients, calendar attendees, Teams mentions, or online-meeting participants. Do not invent these values — always look them up.',
    method: 'GET',
    path: '/users',
    scopes: ['User.ReadBasic.All'],
    projection: 'user',
    // ConsistencyLevel: eventual is required by Graph for $search and most
    // advanced $filter clauses on /users. Setting it unconditionally is safe —
    // Graph also accepts it on plain list requests.
    requestHeaders: { ConsistencyLevel: 'eventual' },
    params: [
      OData.filter,
      OData.search,
      OData.select,
      OData.orderby,
      OData.top,
      OData.skip,
      OData.count,
    ],
    llmTip: `${USER_SELECT_TIP}\n\n${USER_SEARCH_TIP}`,
  },
  {
    name: 'user-get',
    description:
      'Get a single user by id or userPrincipalName. The id can be the Entra object id (GUID) or the UPN (e.g. user@example.com).',
    method: 'GET',
    path: '/users/{user-id}',
    scopes: ['User.ReadBasic.All'],
    projection: 'user',
    params: [
      {
        name: 'user-id',
        location: 'path',
        schema: z.string().describe('Entra object id (GUID) or userPrincipalName'),
      },
      OData.select,
    ],
    llmTip: USER_SELECT_TIP,
  },
  {
    name: 'people-search',
    description:
      'Find the people most relevant to the signed-in user — colleagues AND external contacts they ' +
      'email or meet with — ranked by how much they interact, with fuzzy name matching. Use this to ' +
      'resolve "Jane from Contoso" to an address; use user-search for an exact in-tenant directory lookup.',
    method: 'GET',
    path: '/me/people',
    scopes: ['People.Read'],
    projection: 'person',
    shape: shapePeople,
    params: [
      {
        name: 'search',
        location: 'query',
        schema: z
          .string()
          .describe(
            'Fuzzy name or alias, e.g. "jane" or "Jane Doe". Prefix topic: to match people by email ' +
              'subject matter, e.g. "topic: budget". Cannot combine with skip.'
          )
          .optional(),
      },
      OData.filter,
      OData.select,
      OData.top,
      OData.skip,
    ],
    llmTip:
      'Each result: id, displayName, emails, jobTitle, companyName, and type (OrganizationUser, ' +
      'PersonalContact, ImplicitContact, ...). Omit search to get the top-ranked people overall.',
  },
];
