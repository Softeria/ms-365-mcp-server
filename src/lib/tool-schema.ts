import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { api } from '../generated/client.js';

type ToolEndpoint = (typeof api.endpoints)[number];

function unwrapOptional(schema: z.ZodTypeAny): { inner: z.ZodTypeAny; optional: boolean } {
  const def = (schema as { _def?: { typeName?: string; innerType?: z.ZodTypeAny } })._def;
  const typeName = def?.typeName;
  if (typeName === 'ZodOptional' || typeName === 'ZodDefault' || typeName === 'ZodNullable') {
    return { inner: def!.innerType!, optional: true };
  }
  return { inner: schema, optional: false };
}

/**
 * Returns a JSON Schema describing every parameter a discovery tool accepts,
 * so an agent can construct a correctly-shaped `parameters` object for execute-tool.
 */
export function describeToolSchema(
  tool: ToolEndpoint,
  llmTip: string | undefined
): {
  name: string;
  method: string;
  path: string;
  description: string;
  llmTip?: string;
  parameters: Array<{
    name: string;
    in: 'Path' | 'Query' | 'Body' | 'Header';
    required: boolean;
    description?: string;
    schema: unknown;
  }>;
} {
  const params = (tool.parameters ?? []).map((p) => {
    const { inner, optional } = unwrapOptional(p.schema as z.ZodTypeAny);
    const isPath = p.type === 'Path';
    const jsonSchema = zodToJsonSchema(inner, { target: 'jsonSchema7', $refStrategy: 'none' });
    const { $schema: _s, ...schema } = jsonSchema as Record<string, unknown>;
    return {
      name: p.name,
      in: p.type as 'Path' | 'Query' | 'Body' | 'Header',
      required: isPath || !optional,
      description: p.description,
      schema,
    };
  });

  return {
    name: tool.alias,
    method: tool.method.toUpperCase(),
    path: tool.path,
    description: tool.description ?? '',
    ...(llmTip ? { llmTip } : {}),
    parameters: params,
  };
}
