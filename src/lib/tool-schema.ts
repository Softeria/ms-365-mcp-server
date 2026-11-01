import { z } from 'zod';
import { queryParameterSchema } from './query-parameter-schema.js';
import { tidyToolJsonSchema, zodToToolJsonSchema } from '../normalize-tool-schema.js';
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
  MEMBER_NAME_PARAM_DESCRIPTION,
  type QueryParamConfig,
} from './param-descriptions.js';

type ToolEndpoint = (typeof api.endpoints)[number];

/**
 * Subset of EndpointConfig needed to describe a tool's schema in discovery
 * mode. Kept as a structural type so we don't import the full EndpointConfig
 * from graph-tools.ts (which would create a circular dependency).
 */
export interface ToolSchemaConfig extends DestructiveCheckConfig, QueryParamConfig {
  llmTip?: string;
  descriptionOverride?: string;
  supportsTimezone?: boolean;
  supportsExpandExtendedProperties?: boolean;
  acceptType?: string;
  nameFilter?: boolean;
}

/**
 * Context describeToolSchema needs to replicate registerGraphTools' conditional,
 * per-tool synthetic parameters (account) in discovery mode.
 */
export interface ToolSchemaContext {
  multiAccount?: boolean;
  accountNames?: string[];
}

// zod 4 keeps a .describe() made before .optional() on the inner schema only
function unwrapOptional(schema: z.ZodTypeAny): { inner: z.ZodTypeAny; optional: boolean } {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodNullable
  ) {
    return { inner: schema.unwrap() as z.ZodTypeAny, optional: true };
  }
  return { inner: schema, optional: false };
}

// Discovery hands each parameter out as its own self-contained schema
export function toParamJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const json = zodToToolJsonSchema(schema, 'inline');
  delete json.$schema;
  const definitions = (json.definitions ?? {}) as Record<string, unknown>;
  delete json.definitions;
  const expanded = expandRecursion(json, definitions, new Set()) as Record<string, unknown>;
  tidyToolJsonSchema(expanded);
  return expanded;
}

// get-tool-schema hands parameters out inside a bigger response, where a `$ref` (zod 4 keeps
// one for recursion, even a bare `#`) points at the wrong document. Expand each recursive
// schema once and stop with `{}` where it comes back around, as zod 3 did.
function expandRecursion(
  node: unknown,
  definitions: Record<string, unknown>,
  expanding: Set<string>
): unknown {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((item) => expandRecursion(item, definitions, expanding));
  const { $ref, ...rest } = node as Record<string, unknown>;
  const siblings: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    siblings[key] = expandRecursion(value, definitions, expanding);
  }
  if (typeof $ref !== 'string') return siblings;
  const name = $ref.startsWith('#/definitions/') ? $ref.slice('#/definitions/'.length) : null;
  if (
    name === null ||
    expanding.has(name) ||
    !Object.prototype.hasOwnProperty.call(definitions, name)
  ) {
    return siblings;
  }
  const target = expandRecursion(
    definitions[name],
    definitions,
    new Set([...expanding, name])
  ) as Record<string, unknown>;
  return { ...target, ...siblings };
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
        ? queryParameterSchema(p.name, p.schema as z.ZodTypeAny, config)
        : (p.schema as z.ZodTypeAny);
    if (!effectiveSchema) return [];
    const { inner, optional } = unwrapOptional(effectiveSchema);
    const isPath = p.type === 'Path';
    const schema = toParamJsonSchema(inner);
    return [
      {
        name: p.name,
        in: p.type as 'Path' | 'Query' | 'Body' | 'Header',
        required: isPath || !optional,
        description: effectiveSchema.description ?? inner.description ?? p.description,
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
      description: getFetchAllPagesParamDescription(getMaxPages(), config),
      schema: { type: 'boolean' },
    });
  }

  // Mirrors registerGraphTools: member list tools with nameFilter get `name`.
  if (config?.nameFilter) {
    params.push({
      name: 'name',
      in: 'Query',
      required: false,
      description: MEMBER_NAME_PARAM_DESCRIPTION,
      schema: { type: 'string' },
    });
  }

  // Mirrors registerGraphTools: GET list endpoints have a skiptoken cursor param.
  if (
    isSkiptokenApplicable(
      tool,
      params.map((p) => p.name),
      config
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
    const schema = toParamJsonSchema(inner);
    return {
      name,
      in: 'Query' as const,
      required: !optional,
      description: zodSchema.description ?? inner.description,
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
