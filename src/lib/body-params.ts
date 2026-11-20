import { z } from 'zod';

/** A leaf of a fixedBody the caller may fill, keyed in bodyParams by its param name. */
export interface BodyParamConfig {
  target: Array<string | number>;
  type: 'string' | 'integer';
  description: string;
  required?: boolean;
  minimum?: number;
}

function bodyParamSchema(config: BodyParamConfig): z.ZodTypeAny {
  let schema: z.ZodTypeAny;
  if (config.type === 'integer') {
    const whole = z
      .number()
      .int()
      .min(config.minimum ?? Number.MIN_SAFE_INTEGER);
    // A digit string is read as its number, under the same minimum as a number
    schema = z.union([whole, z.string().regex(/^\d+$/).transform(Number).pipe(whole)]);
  } else {
    schema = z.string();
    if (config.required) schema = (schema as z.ZodString).min(1);
  }
  schema = schema.describe(config.description);
  return config.required ? schema : schema.optional();
}

/** One zod schema per body param, used both to serve the param and to validate the call. */
export function bodyParamSchemas(
  bodyParams: Record<string, BodyParamConfig>
): Record<string, z.ZodTypeAny> {
  return Object.fromEntries(
    Object.entries(bodyParams).map(([name, config]) => [name, bodyParamSchema(config)])
  );
}

/**
 * A copy of fixedBody with each body param the caller gave written at its target. A param
 * the caller leaves out keeps the value fixedBody holds.
 */
export function buildFixedBody(
  fixedBody: Record<string, unknown>,
  bodyParams: Record<string, BodyParamConfig>,
  params: Record<string, unknown>
): { body: Record<string, unknown> } | { error: string } {
  const body = structuredClone(fixedBody);
  const schemas = bodyParamSchemas(bodyParams);
  for (const [name, config] of Object.entries(bodyParams)) {
    const parsed = schemas[name].safeParse(params[name]);
    if (!parsed.success) {
      return { error: `Invalid ${name}: ${parsed.error.issues.map((i) => i.message).join('; ')}` };
    }
    if (parsed.data === undefined) continue;
    let node = body as Record<string | number, unknown>;
    for (const step of config.target.slice(0, -1)) {
      node = node[step] as Record<string | number, unknown>;
    }
    node[config.target[config.target.length - 1]] = parsed.data;
  }
  return { body };
}
