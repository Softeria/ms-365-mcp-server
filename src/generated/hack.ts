import { Endpoint, Parameter } from './endpoint-types.js';
import { z } from 'zod';

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
      endpoint.parameters = endpoint.parameters || [];
      for (const parameter of endpoint.parameters) {
        parameter.name = parameter.name.replace(/[$_]+/g, '');
      }

      const pathParamRegex = /:([a-zA-Z0-9]+)/g;
      const pathParams = [];
      let match;
      while ((match = pathParamRegex.exec(endpoint.path)) !== null) {
        pathParams.push(match[1]);
      }

      for (const pathParam of pathParams) {
        const paramExists = endpoint.parameters.some(
          (param) => param.name === pathParam || param.name === pathParam.replace(/[$_]+/g, '')
        );

        if (!paramExists) {
          const newParam: Parameter = {
            name: pathParam,
            type: 'Path',
            schema: z.string().describe(`Path parameter: ${pathParam}`),
            description: `Path parameter: ${pathParam}`,
          };
          endpoint.parameters.push(newParam);
        }
      }

      return endpoint;
    });
  }
}

export type ZodiosOptions = {};
