import type { CallToolResult } from '../../graph-tools.js';
import {
  FORBIDDEN_RESULT_KEYS,
  McpResultEnvelopeZod,
  type McpResultResource,
  type McpStructuredContent,
  toOutputJsonSchema,
} from './schemas.js';

const DEFAULT_NEXT_ACTION = 'Review the text fallback for details.';
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_KEYS = 100;
const MAX_DEPTH = 6;
const MAX_STRING_LENGTH = 4000;

export interface CreateMcpResultEnvelopeInput {
  toolName: string;
  summary: string;
  data?: unknown;
  resources?: McpResultResource[];
  nextActions?: string[];
  warnings?: string[];
  meta?: Record<string, unknown>;
  textDetails?: {
    heading: string;
    data: unknown;
  };
}

export interface CreateMcpErrorEnvelopeInput {
  toolName: string;
  summary: string;
  code: string;
  message: string;
  data?: unknown;
  resources?: McpResultResource[];
  nextActions?: string[];
  warnings?: string[];
  meta?: Record<string, unknown>;
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[truncated:max-depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value !== 'object') return String(value);

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !FORBIDDEN_RESULT_KEYS.has(key.toLowerCase()))
    .slice(0, MAX_OBJECT_KEYS)
    .map(([key, nested]) => [key, sanitizeValue(nested, depth + 1)] as const);
  return Object.fromEntries(entries);
}

function sanitizeMeta(
  meta: Record<string, unknown> | undefined,
  toolName: string
): Record<string, unknown> {
  return {
    toolAlias: toolName,
    ...((sanitizeValue(meta ?? {}) as Record<string, unknown>) ?? {}),
  };
}

function compactList(values: string[] | undefined, fallback: string[] = []): string[] {
  const compacted = (values ?? fallback).map((value) => value.trim()).filter(Boolean);
  return compacted.length > 0 ? compacted : fallback;
}

function renderText(
  structured: McpStructuredContent,
  isError = false,
  textDetails?: CreateMcpResultEnvelopeInput['textDetails']
): string {
  const lines = [structured.summary];
  if (isError) lines.unshift('Error');
  if (structured.warnings.length > 0) {
    lines.push('', 'Warnings:', ...structured.warnings.map((warning) => `- ${warning}`));
  }
  if (structured.resources.length > 0) {
    lines.push(
      '',
      'Resources:',
      ...structured.resources.map(
        (resource) => `- Open ${resource.name ?? 'resource'}: ${resource.uri}`
      )
    );
  }
  if (textDetails) {
    lines.push('', textDetails.heading, JSON.stringify(sanitizeValue(textDetails.data), null, 2));
  }
  if (structured.nextActions.length > 0) {
    lines.push('', 'Next actions:', ...structured.nextActions.map((action) => `- ${action}`));
  }
  return lines.join('\n');
}

function fallbackResult(input: {
  toolName: string;
  summary: string;
  data?: unknown;
  resources?: McpResultResource[];
  nextActions?: string[];
  warnings?: string[];
  meta?: Record<string, unknown>;
  isError?: boolean;
}): CallToolResult {
  const warnings = compactList(input.warnings, []);
  const safeSummary = input.summary.trim() || 'Structured result unavailable.';
  const fallback = {
    summary: safeSummary,
    data: sanitizeValue(input.data),
    resources: sanitizeValue(input.resources ?? []),
    nextActions: compactList(input.nextActions, [DEFAULT_NEXT_ACTION]),
    warnings: ['structured_content_schema_invalid', ...warnings],
  };
  return {
    content: [
      {
        type: 'text',
        text: `Structured result unavailable; falling back to JSON text.\n${JSON.stringify(fallback, null, 2)}`,
      },
    ],
    ...(input.isError ? { isError: true } : {}),
    _meta: {
      ...sanitizeMeta(input.meta, input.toolName),
      structuredFallback: true,
      warnings: ['structured_content_schema_invalid', ...warnings],
    },
  };
}

export function createMcpResultEnvelope(input: CreateMcpResultEnvelopeInput): CallToolResult {
  const candidate = {
    summary: input.summary,
    data: sanitizeValue(input.data),
    resources: sanitizeValue(input.resources ?? []),
    nextActions: compactList(input.nextActions, [DEFAULT_NEXT_ACTION]),
    warnings: compactList(input.warnings, []),
  };
  const parsed = McpResultEnvelopeZod.safeParse({
    content: [
      {
        type: 'text',
        text: renderText(candidate as McpStructuredContent, false, input.textDetails),
      },
    ],
    structuredContent: candidate,
    _meta: sanitizeMeta(input.meta, input.toolName),
  });

  if (!parsed.success) return fallbackResult(input);
  return parsed.data as CallToolResult;
}

export function createMcpErrorEnvelope(input: CreateMcpErrorEnvelopeInput): CallToolResult {
  const data = sanitizeValue({
    ...(typeof input.data === 'object' && input.data !== null
      ? (input.data as Record<string, unknown>)
      : {}),
    error: {
      code: input.code,
      message: input.message,
    },
  });
  const candidate = {
    summary: input.summary,
    data,
    resources: sanitizeValue(input.resources ?? []),
    nextActions: compactList(input.nextActions, [DEFAULT_NEXT_ACTION]),
    warnings: compactList(input.warnings, []),
  };
  const parsed = McpResultEnvelopeZod.safeParse({
    content: [{ type: 'text', text: renderText(candidate as McpStructuredContent, true) }],
    structuredContent: candidate,
    _meta: {
      ...sanitizeMeta(input.meta, input.toolName),
      errorCode: input.code,
    },
    isError: true,
  });

  if (!parsed.success) return fallbackResult({ ...input, data, isError: true });
  return parsed.data as CallToolResult;
}

export function outputSchemaFor(name: string): Record<string, unknown> {
  return toOutputJsonSchema(name);
}
