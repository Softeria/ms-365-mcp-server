import { Endpoint, Parameter } from './endpoint-types.js';
import { z } from 'zod';
import { describePathParam } from '../lib/path-params.js';

export function makeApi(endpoints: Endpoint[]) {
  return endpoints;
}

/** True when a path parameter carries only the generated `Path parameter: x` placeholder. */
function isPathParamStub(param: Parameter): boolean {
  const description = param.description ?? param.schema?.description;
  return typeof description === 'string' && /^Path parameter: /.test(description);
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
        const existing = endpoint.parameters.find(
          (param) => param.name === pathParam || param.name === pathParam.replace(/[$_]+/g, '')
        );

        if (!existing) {
          const description = describePathParam(pathParam);
          const newParam: Parameter = {
            name: pathParam,
            type: 'Path',
            schema: z.string().describe(description),
            description,
          };
          endpoint.parameters.push(newParam);
          continue;
        }

        // Some operations arrive with the path parameter already declared, but described
        // only as `Path parameter: drive-id` — no more use to the model than nothing, and
        // spelled in kebab-case so it does not even match the name callers must send.
        // Upgrade those; any real upstream description is left alone.
        if (existing.type === 'Path' && isPathParamStub(existing)) {
          const description = describePathParam(existing.name);
          existing.description = description;
          existing.schema = z.string().describe(description);
        }
      }

      return endpoint;
    });
  }
}

export type ZodiosOptions = {};
