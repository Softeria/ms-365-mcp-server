import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import logger from '../../logger.js';
import { getRequestTenant } from '../../request-context.js';
import type { RedisClient } from '../redis.js';
import { publishResourceUpdated } from '../mcp-notifications/events.js';
import { emitMcpLogEvent } from '../mcp-logging/register.js';
import { createMcpErrorEnvelope, createMcpResultEnvelope } from '../mcp-results/envelope.js';
import { MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA } from '../mcp-results/schemas.js';
import { FactContentZod, FactScopeZod, forgetFact, recallFacts, recordFact } from './facts.js';

const FACT_RESOURCE_REASON = 'fact-change';

const RecordFactInputZod = z.object({
  scope: FactScopeZod.describe('Caller-defined namespace for this fact.'),
  fact: FactContentZod.describe('Durable tenant fact or preference to remember.'),
});

const RecallFactsInputZod = z.object({
  scope: FactScopeZod.optional().describe('Optional namespace to search within.'),
  query: z.string().trim().min(1).max(1000).optional().describe('Optional full-text query.'),
  limit: z.number().int().optional().describe('Maximum facts to return; clamped to 1..50.'),
});

const ForgetFactInputZod = z.object({
  id: z.string().trim().min(1).max(512).describe('Fact id to delete for this tenant.'),
});

export interface FactToolDeps {
  redis: RedisClient;
}

function jsonResult(value: unknown, isError = false, toolName = 'record-fact') {
  if (isError) {
    const errorValue =
      typeof value === 'object' && value !== null ? (value as { error?: unknown }) : {};
    const code = typeof errorValue.error === 'string' ? errorValue.error : 'fact_tool_error';
    return {
      ...createMcpErrorEnvelope({
        toolName,
        summary: `Fact operation failed: ${code}.`,
        code,
        message: code,
        data: value,
        nextActions: ['Check the supplied fact arguments and retry.'],
      }),
      content: [{ type: 'text' as const, text: JSON.stringify(value) }],
    };
  }
  return {
    ...createMcpResultEnvelope({
      toolName,
      summary: `Fact operation completed for ${toolName}.`,
      data: value,
      nextActions: ['Use recall-facts when this context is needed.'],
    }),
    content: [{ type: 'text' as const, text: JSON.stringify(value) }],
  };
}

function requireTenant():
  | {
      id: string;
    }
  | undefined {
  const tenant = getRequestTenant();
  if (!tenant.id) return undefined;
  return { id: tenant.id };
}

async function publishFactChange(redis: RedisClient, tenantId: string): Promise<void> {
  try {
    await publishResourceUpdated(redis, tenantId, [
      `m365://tenant/${tenantId}/facts.json`,
      `mcp://tenant/${tenantId}/facts.json`,
    ]);
  } catch (err) {
    logger.warn(
      { tenantId, reason: FACT_RESOURCE_REASON, err: (err as Error).message },
      'fact-tools: publish facts.json update failed; Redis notification skipped'
    );
  }
}

export function registerFactTools(server: McpServer, deps: FactToolDeps): void {
  server.tool(
    'record-fact',
    'Remember a durable tenant-scoped fact, preference, or workflow note.',
    {
      scope: RecordFactInputZod.shape.scope,
      fact: RecordFactInputZod.shape.fact,
    },
    {
      title: 'record-fact',
      readOnlyHint: false,
      openWorldHint: false,
    },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return jsonResult({ error: 'tenant_required' }, true, 'record-fact');

      const parsed = RecordFactInputZod.safeParse(args);
      if (!parsed.success) {
        return jsonResult(
          {
            error: 'invalid_fact',
            details: parsed.error.issues.map((issue) => issue.message),
          },
          true
        );
      }

      const fact = await recordFact(tenant.id, {
        scope: parsed.data.scope,
        content: parsed.data.fact,
      });
      await emitMcpLogEvent({
        tenantId: tenant.id,
        event: 'fact.recorded',
        level: 'info',
        data: {
          scope: parsed.data.scope,
        },
      });
      await publishFactChange(deps.redis, tenant.id);
      return jsonResult(fact, false, 'record-fact');
    }
  );

  server.tool(
    'recall-facts',
    'Recall tenant-scoped facts by optional namespace and full-text query.',
    {
      scope: RecallFactsInputZod.shape.scope,
      query: RecallFactsInputZod.shape.query,
      limit: RecallFactsInputZod.shape.limit,
    },
    {
      title: 'recall-facts',
      readOnlyHint: true,
      openWorldHint: false,
    },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return jsonResult({ error: 'tenant_required' }, true, 'record-fact');

      const parsed = RecallFactsInputZod.safeParse(args);
      if (!parsed.success) {
        return jsonResult(
          {
            error: 'invalid_recall_facts',
            details: parsed.error.issues.map((issue) => issue.message),
          },
          true
        );
      }

      const facts = await recallFacts(tenant.id, parsed.data);
      return jsonResult({ facts }, false, 'recall-facts');
    }
  );

  server.tool(
    'forget-fact',
    'Forget a tenant-scoped fact by id.',
    {
      id: ForgetFactInputZod.shape.id,
    },
    {
      title: 'forget-fact',
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return jsonResult({ error: 'tenant_required' }, true, 'record-fact');

      const parsed = ForgetFactInputZod.safeParse(args);
      if (!parsed.success) {
        return jsonResult(
          {
            error: 'invalid_forget_fact',
            details: parsed.error.issues.map((issue) => issue.message),
          },
          true
        );
      }

      const result = await forgetFact(tenant.id, parsed.data.id);
      if (result.deleted) await publishFactChange(deps.redis, tenant.id);
      return jsonResult(result, false, 'forget-fact');
    }
  );

  for (const name of ['record-fact', 'recall-facts'] as const) {
    (
      server as unknown as {
        _registeredTools: Record<string, { update: (input: { outputSchema: never }) => void }>;
      }
    )._registeredTools[name]?.update({
      outputSchema: MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA.shape as never,
    });
  }
}
