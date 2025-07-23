import { Endpoint } from './src/generated/endpoint-types.js';
import { Zodios } from './src/generated/hack.js';

const testEndpoint: Endpoint = {
  method: 'get',
  path: '/me/mailFolders/{mailFolder-id}/messages',
  alias: 'test-endpoint',
  description: 'Test endpoint',
  requestFormat: 'json',
  parameters: [],
  response: {} as Record<string, unknown>,
};

const zodios = new Zodios([testEndpoint]);

console.log('Parameters after processing:');
console.log(JSON.stringify(zodios.endpoints[0].parameters, null, 2));
