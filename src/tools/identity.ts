import { OData, type Tool } from './types.js';

export const identityTools: readonly Tool[] = [
  {
    name: 'identity-get-me',
    description:
      "Get the signed-in user's profile: id, displayName, userPrincipalName, mail, jobTitle, department.",
    method: 'GET',
    path: '/me',
    scopes: ['User.Read'],
    projection: 'user',
    params: [OData.select],
  },
];
