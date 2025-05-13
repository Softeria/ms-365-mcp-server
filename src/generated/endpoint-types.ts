import { z } from 'zod';

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

export type Parameter = {
  name: string;
  type: 'Query' | 'Path' | 'Body' | 'Header';
  schema: z.ZodType<any>;
  description?: string;
};

export type Endpoint = {
  method: HttpMethod;
  path: string;
  alias: string;
  description?: string;
  requestFormat: 'json';
  parameters?: Parameter[];
  response: z.ZodType<any>;
  errors?: Array<{
    status: number;
    description?: string;
    schema?: z.ZodType<any>;
  }>;
};

export type Endpoints = Endpoint[];
