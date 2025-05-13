import { Endpoint } from './endpoint-types.js';

export function makeApi(endpoints: Endpoint[]) {
  return endpoints;
}

export class Zodios {
  endpoints: Endpoint[];

  constructor(baseUrlOrEndpoints: Endpoint[] | string, endpoints?: any, options?: any) {
    if (typeof baseUrlOrEndpoints === 'string') {
      throw new Error('No such hack');
    }
    this.endpoints = baseUrlOrEndpoints.map((endpoint) => {
      for (const parameter of endpoint.parameters ?? []) {
        // We need a hack since MCP won't support $ in parameter names
        parameter.name = parameter.name.replace(/\$/g, '__');
      }
      return endpoint;
    });
  }
}

export type ZodiosOptions = {};
