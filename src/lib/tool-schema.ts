import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { api } from '../generated/client.js';
import { isDestructiveOperation, type DestructiveCheckConfig } from './destructive-ops.js';

type ToolEndpoint = (typeof api.endpoints)[number];

/**
 * Subset of EndpointConfig needed to describe a tool's schema in discovery
 * mode. Kept as a structural type so we don't import the full EndpointConfig
 * from graph-tools.ts (which would create a circular dependency).
 */
export interface ToolSchemaConfig extends DestructiveCheckConfig {
  llmTip?: string;
  descriptionOverride?: string;
}

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
 *
 * Includes synthetic runtime params injected by graph-tools.ts that an agent
 * needs to know about — currently `confirm` for destructive operations. Other
 * runtime params (`fetchAllPages`, `account`, `includeHeaders`, ...) are not
 * yet surfaced here; they're optional booleans with safe defaults so omitting
 * them from discovery only costs a feature, not correctness. `confirm` is the
 * exception because the server fails closed without it on destructive tools.
 */
export function describeToolSchema(
  tool: ToolEndpoint,
  config: ToolSchemaConfig | undefined
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

  // Surface the destructive-confirm gate so agents in --discovery mode know
  // to pass `confirm: true`. Without this, every destructive tool returns
  // confirmation_required with no way for the agent to recover from the schema.
  if (isDestructiveOperation(tool.method, config)) {
    params.push({
      name: 'confirm',
      in: 'Query',
      required: false,
      description:
        'For destructive operations when the confirm gate is enabled (MS365_MCP_REQUIRE_CONFIRM=true; off by default). ' +
        'Set to true only after the user has explicitly approved this action. ' +
        'When the gate is on, calls without confirm: true return { error: "confirmation_required" } without touching user data.',
      schema: { type: 'boolean' },
    });
  }

  const llmTip = config?.llmTip;
  return {
    name: tool.alias,
    method: tool.method.toUpperCase(),
    path: tool.path,
    description: config?.descriptionOverride ?? tool.description ?? '',
    ...(llmTip ? { llmTip } : {}),
    parameters: params,
  };
}

interface UtilityDescriptor {
  name: string;
  method: string;
  path: string;
  description: string;
  buildSchema: (ctx: never) => Record<string, z.ZodTypeAny>;
}

// Params reported as `Query` (top-level): execute-tool passes `parameters`
// straight to utility.execute(); `Body` would mislead LLMs into nesting under `body`.
export function describeUtilityToolSchema<C>(
  utility: UtilityDescriptor & { buildSchema: (ctx: C) => Record<string, z.ZodTypeAny> },
  ctx: C
): {
  name: string;
  method: string;
  path: string;
  description: string;
  parameters: Array<{
    name: string;
    in: 'Query';
    required: boolean;
    description?: string;
    schema: unknown;
  }>;
} {
  const schemaMap = utility.buildSchema(ctx);
  const params = Object.entries(schemaMap).map(([name, zodSchema]) => {
    const { inner, optional } = unwrapOptional(zodSchema);
    const jsonSchema = zodToJsonSchema(inner, { target: 'jsonSchema7', $refStrategy: 'none' });
    const { $schema: _s, ...schema } = jsonSchema as Record<string, unknown>;
    return {
      name,
      in: 'Query' as const,
      required: !optional,
      description: zodSchema.description,
      schema,
    };
  });
  return {
    name: utility.name,
    method: utility.method,
    path: utility.path,
    description: utility.description,
    parameters: params,
  };
}
