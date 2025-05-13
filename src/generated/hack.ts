import { Endpoint } from './endpoint-types.js';

export function makeApi(endpoints: Endpoint[]) {
  return endpoints;
}

export class Zodios {
  endpoints: Endpoint[];

  constructor(baseUrlOrEndpoints: any, endpoints?: any, options?: any) {
    this.endpoints = baseUrlOrEndpoints;
  }
}

export type ZodiosOptions = {};
