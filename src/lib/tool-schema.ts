import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { queryParameterSchema } from './query-parameter-schema.js';
import type { api } from '../generated/client.js';
import { isDestructiveOperation, type DestructiveCheckConfig } from './destructive-ops.js';
import {
  isFetchAllPagesApplicable,
  isSkiptokenApplicable,
  SKIPTOKEN_PARAM_DESCRIPTION,
  getMaxPages,
  getFetchAllPagesParamDescription,
  getAccountParamDescription,
  CONFIRM_PARAM_DESCRIPTION,
  TIMEZONE_PARAM_DESCRIPTION,
  EXPAND_EXTENDED_PROPERTIES_PARAM_DESCRIPTION,
  getAcceptParamDescription,
} from './param-descriptions.js';

type ToolEndpoint = (typeof api.endpoints)[number];

/**
 * Subset of EndpointConfig needed to describe a tool's schema in discovery
 * mode. Kept as a structural type so we don't import the full EndpointConfig
 * from graph-tools.ts (which would create a circular dependency).
 */
export interface ToolSchemaConfig extends DestructiveCheckConfig {
  llmTip?: string;
  descriptionOverride?: string;
  supportsTimezone?: boolean;
  supportsExpandExtendedProperties?: boolean;
  acceptType?: string;
}

/**
 * Context describeToolSchema needs to replicate registerGraphTools' conditional,
 * per-tool synthetic parameters (account) in discovery mode.
 */
export interface ToolSchemaContext {
  multiAccount?: boolean;
  accountNames?: string[];
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
 * Query types, constraints, exclusions, and descriptions use queryParameterSchema,
 * shared with normal registration and execution. Generated OpenAPI parameters
 * alone are not the effective runtime contract.
 *
 * Also includes synthetic runtime params injected by graph-tools.ts that an agent
 * needs to know about: `confirm` (destructive gate), `fetchAllPages` (GET list
 * endpoints), `account` (multi-account mode, via `ctx`), `timezone` and
 * `expandExtendedProperties` (calendar endpoints, via `config`). `includeHeaders`
 * and `excludeResponse` are intentionally NOT surfaced here — they're the same
 * static text on every tool (no per-tool override to drift), optional booleans
 * with safe defaults, so omitting them from discovery only costs a feature, not
 * correctness.
 */
export function describeToolSchema(
  tool: ToolEndpoint,
  config: ToolSchemaConfig | undefined,
  ctx: ToolSchemaContext = {}
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
  const params = (tool.parameters ?? []).flatMap((p) => {
    const effectiveSchema =
      p.type === 'Query'
        ? queryParameterSchema(tool.alias, p.name, p.schema as z.ZodTypeAny)
        : (p.schema as z.ZodTypeAny);
    if (!effectiveSchema) return [];
    const { inner, optional } = unwrapOptional(effectiveSchema);
    const isPath = p.type === 'Path';
    const jsonSchema = zodToJsonSchema(inner, { target: 'jsonSchema7', $refStrategy: 'none' });
    const { $schema: _s, ...schema } = jsonSchema as Record<string, unknown>;
    return [
      {
        name: p.name,
        in: p.type as 'Path' | 'Query' | 'Body' | 'Header',
        required: isPath || !optional,
        description: effectiveSchema.description ?? p.description,
        schema,
      },
    ];
  });

  // Surface the destructive-confirm gate so agents in --discovery mode know
  // to pass `confirm: true`. Without this, every destructive tool returns
  // confirmation_required with no way for the agent to recover from the schema.
  if (isDestructiveOperation(tool.method, config)) {
    params.push({
      name: 'confirm',
      in: 'Query',
      required: false,
      description: CONFIRM_PARAM_DESCRIPTION,
      schema: { type: 'boolean' },
    });
  }

  // Mirrors registerGraphTools: GET list endpoints get a synthetic fetchAllPages param.
  if (isFetchAllPagesApplicable({ method: tool.method, path: tool.path })) {
    params.push({
      name: 'fetchAllPages',
      in: 'Query',
      required: false,
      description: getFetchAllPagesParamDescription(getMaxPages()),
      schema: { type: 'boolean' },
    });
  }

  // Mirrors registerGraphTools: GET list endpoints have a skiptoken cursor param.
  if (
    isSkiptokenApplicable(
      { method: tool.method },
      params.map((p) => p.name)
    )
  ) {
    params.push({
      name: 'skiptoken',
      in: 'Query',
      required: false,
      description: SKIPTOKEN_PARAM_DESCRIPTION,
      schema: { type: 'string' },
    });
  }

  // Mirrors registerGraphTools: multi-account mode adds an `account` param to every tool.
  if (ctx.multiAccount) {
    params.push({
      name: 'account',
      in: 'Query',
      required: false,
      description: getAccountParamDescription(ctx.accountNames ?? []),
      schema: { type: 'string' },
    });
  }

  // Mirrors registerGraphTools: calendar endpoints that support it get `timezone`.
  if (config?.supportsTimezone) {
    params.push({
      name: 'timezone',
      in: 'Query',
      required: false,
      description: TIMEZONE_PARAM_DESCRIPTION,
      schema: { type: 'string' },
    });
  }

  // Mirrors registerGraphTools: calendar endpoints that support it get
  // `expandExtendedProperties`.
  if (config?.supportsExpandExtendedProperties) {
    params.push({
      name: 'expandExtendedProperties',
      in: 'Query',
      required: false,
      description: EXPAND_EXTENDED_PROPERTIES_PARAM_DESCRIPTION,
      schema: { type: 'boolean' },
    });
  }

  // Mirrors registerGraphTools: endpoints with a configured acceptType get a
  // synthetic, optional `Accept` header param so the configured default can be
  // overridden when Graph asks for a different representation.
  if (config?.acceptType && !params.some((p) => p.name.toLowerCase() === 'accept')) {
    params.push({
      name: 'Accept',
      in: 'Header',
      required: false,
      description: getAcceptParamDescription(config.acceptType),
      schema: { type: 'string' },
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
