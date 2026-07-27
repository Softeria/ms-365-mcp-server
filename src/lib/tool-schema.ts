import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { api } from '../generated/client.js';
import { isDestructiveOperation, type DestructiveCheckConfig } from './destructive-ops.js';
import {
  getODataParamDescription,
  shouldOmitTopParam,
  isFetchAllPagesApplicable,
  getMaxPages,
  getFetchAllPagesParamDescription,
  getAccountParamDescription,
  CONFIRM_PARAM_DESCRIPTION,
  TIMEZONE_PARAM_DESCRIPTION,
  EXPAND_EXTENDED_PROPERTIES_PARAM_DESCRIPTION,
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

/** Strips a leading `$` so both `filter` and `$filter` map to the same lookup key. */
function bareParamName(name: string): string {
  return name.startsWith('$') ? name.slice(1) : name;
}

/**
 * Returns a JSON Schema describing every parameter a discovery tool accepts,
 * so an agent can construct a correctly-shaped `parameters` object for execute-tool.
 *
 * Descriptions for OData query parameters ($filter/$search/$select/$expand/$orderby/
 * $top/$skip/$count) are overridden with the same spec-gap guidance text
 * registerGraphTools puts in its Zod schemas — both pull from
 * lib/param-descriptions.ts so the two paths can't drift apart again. $top/top is
 * omitted entirely for tools in TOP_UNSUPPORTED_DELTA_TOOLS, mirroring
 * registerGraphTools' `delete paramSchema['top']`.
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
  const omitTop = shouldOmitTopParam(tool.alias);

  const params = (tool.parameters ?? [])
    .filter((p) => !(omitTop && bareParamName(p.name) === 'top'))
    .map((p) => {
      const { inner, optional } = unwrapOptional(p.schema as z.ZodTypeAny);
      const isPath = p.type === 'Path';
      const jsonSchema = zodToJsonSchema(inner, { target: 'jsonSchema7', $refStrategy: 'none' });
      const { $schema: _s, ...schema } = jsonSchema as Record<string, unknown>;
      const override =
        p.type === 'Query' ? getODataParamDescription(bareParamName(p.name)) : undefined;
      return {
        name: p.name,
        in: p.type as 'Path' | 'Query' | 'Body' | 'Header',
        required: isPath || !optional,
        description: override ?? p.description,
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
