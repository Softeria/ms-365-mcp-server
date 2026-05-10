import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const FORBIDDEN_RESULT_KEYS = new Set([
  'accesstoken',
  'refreshtoken',
  'clientsecret',
  'authorization',
]);

const MAX_SUMMARY_LENGTH = 500;
const MAX_TEXT_LENGTH = 8000;
const MAX_ACTIONS = 5;
const MAX_WARNINGS = 10;
const MAX_RESOURCES = 25;

function containsForbiddenKey(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = containsForbiddenKey(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof value !== 'object' || value === null) return null;

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_RESULT_KEYS.has(key.toLowerCase())) return key;
    const found = containsForbiddenKey(nested);
    if (found) return found;
  }

  return null;
}

function secretFreeJson(label: string): z.ZodType<unknown> {
  return z.unknown().superRefine((value, ctx) => {
    const forbidden = containsForbiddenKey(value);
    if (!forbidden) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} contains forbidden key: ${forbidden}`,
    });
  });
}

export const McpResultResourceZod = z
  .object({
    uri: z.string().min(1).max(2048),
    name: z.string().min(1).max(200).optional(),
    mimeType: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(500).optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    const forbidden = containsForbiddenKey(value);
    if (!forbidden) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `resource contains forbidden key: ${forbidden}`,
    });
  });

export const McpStructuredContentZod = z
  .object({
    summary: z.string().trim().min(1).max(MAX_SUMMARY_LENGTH),
    data: secretFreeJson('structuredContent.data').optional(),
    resources: z.array(McpResultResourceZod).max(MAX_RESOURCES).default([]),
    nextActions: z.array(z.string().trim().min(1).max(300)).max(MAX_ACTIONS).default([]),
    warnings: z.array(z.string().trim().min(1).max(300)).max(MAX_WARNINGS).default([]),
  })
  .strict();

export const MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA = McpStructuredContentZod;

export const McpTextContentZod = z
  .object({
    type: z.literal('text'),
    text: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
  })
  .strict();

export const McpResultMetaZod = z
  .record(secretFreeJson('_meta'))
  .optional()
  .superRefine((value, ctx) => {
    const forbidden = containsForbiddenKey(value);
    if (!forbidden) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `_meta contains forbidden key: ${forbidden}`,
    });
  });

export const McpResultEnvelopeZod = z
  .object({
    content: z.array(McpTextContentZod).min(1),
    structuredContent: McpStructuredContentZod.optional(),
    _meta: McpResultMetaZod,
    isError: z.boolean().optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (value.structuredContent && value.content[0]?.text.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'content[0].text must be non-empty when structuredContent is present',
      });
    }
  });

export type McpStructuredContent = z.infer<typeof McpStructuredContentZod>;
export type McpResultEnvelope = z.infer<typeof McpResultEnvelopeZod>;
export type McpResultResource = z.infer<typeof McpResultResourceZod>;

export function toOutputJsonSchema(_name: string): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(McpResultEnvelopeZod, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  }) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
}
