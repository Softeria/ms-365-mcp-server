import { describe, expect, it, vi } from 'vitest';
import { requestContext } from '../../src/request-context.js';
import { buildBulkPlan, bulkPlanPublicSummary } from '../../src/lib/bulk-actions/plan.js';
import {
  BULK_ACTION_TOOL,
  READ_BULK_RESULT_TOOL,
  type BulkActionInput,
} from '../../src/lib/bulk-actions/schema.js';

vi.mock('../../src/generated/client.js', async () => {
  const { z } = await import('zod');
  return {
    api: {
      endpoints: [
        {
          alias: 'get-chat',
          method: 'GET',
          path: '/chats/:chatId',
          parameters: [
            { name: 'chatId', type: 'Path', schema: z.string() },
            {
              name: 'select',
              type: 'Query',
              schema: z.union([z.string(), z.array(z.string())]).optional(),
            },
          ],
        },
        {
          alias: 'list-chats',
          method: 'GET',
          path: '/chats',
          parameters: [
            { name: 'top', type: 'Query', schema: z.number().optional() },
            { name: 'count', type: 'Query', schema: z.boolean().optional() },
          ],
        },
        {
          alias: 'list-user-messages',
          method: 'GET',
          path: '/users/:user-id/messages',
          parameters: [],
        },
        {
          alias: 'get-meeting-transcript-content',
          method: 'GET',
          path: '/me/onlineMeetings/:meetingId/transcripts/:transcriptId/content',
          parameters: [
            { name: 'meetingId', type: 'Path', schema: z.string() },
            { name: 'transcriptId', type: 'Path', schema: z.string() },
          ],
        },
        {
          alias: 'delete-onedrive-file',
          method: 'DELETE',
          path: '/drives/:driveId/items/:driveItemId',
          parameters: [
            { name: 'driveId', type: 'Path', schema: z.string() },
            { name: 'driveItemId', type: 'Path', schema: z.string() },
          ],
        },
      ],
    },
  };
});

function runWithTenant<T>(enabled: string[], fn: () => T): T {
  return requestContext.run(
    {
      tenantId: 'tenant-a',
      enabledToolsSet: new Set(enabled),
      enabledToolsExplicit: true,
      presetVersion: 'custom',
      ownerSubject: 'owner-a',
    },
    fn
  );
}

describe('bulk action planner', () => {
  it('accepts public single-tool OData string parameter overrides', () => {
    const plan = runWithTenant([BULK_ACTION_TOOL, READ_BULK_RESULT_TOOL, 'get-chat'], () =>
      buildBulkPlan(
        {
          mode: 'preview',
          outputMode: 'summary',
          items: [
            {
              id: 'read-1',
              toolName: 'get-chat',
              parameters: { chatId: 'secret-chat-id', select: 'id,topic' },
            },
          ],
        },
        { readOnly: false, orgMode: true, now: new Date('2026-06-05T00:00:00Z') }
      )
    );
    expect('error' in plan).toBe(false);
    if ('error' in plan) return;
    expect(plan.items[0]).toMatchObject({ status: 'allowed' });
    expect(plan.executionParameters.get('read-1')).toMatchObject({ select: 'id,topic' });
  });

  it('accepts numeric and boolean public OData controls', () => {
    const plan = runWithTenant([BULK_ACTION_TOOL, READ_BULK_RESULT_TOOL, 'list-chats'], () =>
      buildBulkPlan(
        {
          mode: 'preview',
          outputMode: 'summary',
          items: [
            {
              id: 'list-1',
              toolName: 'list-chats',
              parameters: { top: 5, count: true },
            },
          ],
        },
        { readOnly: false, orgMode: true, now: new Date('2026-06-05T00:00:00Z') }
      )
    );
    expect('error' in plan).toBe(false);
    if ('error' in plan) return;
    expect(plan.items[0]).toMatchObject({ status: 'allowed' });
    expect(plan.executionParameters.get('list-1')).toMatchObject({ top: 5, count: true });
  });

  it('documents intentional strict unknown parameter rejection for bulk safety', () => {
    const plan = runWithTenant([BULK_ACTION_TOOL, 'get-chat'], () =>
      buildBulkPlan(
        {
          mode: 'preview',
          outputMode: 'summary',
          items: [
            { id: 'read-1', toolName: 'get-chat', parameters: { chatId: 'a', unknown: 'ignored' } },
          ],
        },
        { readOnly: false, orgMode: true, now: new Date('2026-06-05T00:00:00Z') }
      )
    );
    expect('error' in plan).toBe(false);
    if ('error' in plan) return;
    expect(plan.items[0]).toMatchObject({ status: 'invalid', code: 'parameter_validation_failed' });
  });

  it('marks safe v1 JSON aliases as batch-eligible while still routing through alias fallback', () => {
    const plan = runWithTenant([BULK_ACTION_TOOL, READ_BULK_RESULT_TOOL, 'get-chat'], () =>
      buildBulkPlan(
        {
          mode: 'preview',
          outputMode: 'summary',
          items: [
            {
              id: 'read-1',
              toolName: 'get-chat',
              parameters: { chatId: 'secret-chat-id' },
            },
          ],
        },
        { readOnly: false, orgMode: true, now: new Date('2026-06-05T00:00:00Z') }
      )
    );
    expect('error' in plan).toBe(false);
    if ('error' in plan) return;
    expect(plan.items[0]).toMatchObject({
      status: 'allowed',
      batchStrategy: 'graph_batch_eligible_alias_fallback',
    });
  });

  it('accepts hyphenated path parameters extracted from generated path templates', () => {
    const plan = runWithTenant([BULK_ACTION_TOOL, 'list-user-messages'], () =>
      buildBulkPlan(
        {
          mode: 'preview',
          outputMode: 'summary',
          items: [
            {
              id: 'hyphen-1',
              toolName: 'list-user-messages',
              parameters: { 'user-id': 'user-id-value' },
            },
          ],
        },
        { readOnly: false, orgMode: true, now: new Date('2026-06-05T00:00:00Z') }
      )
    );
    expect('error' in plan).toBe(false);
    if ('error' in plan) return;
    expect(plan.items[0]).toMatchObject({ status: 'allowed' });
    expect(plan.executionParameters.get('hyphen-1')).toMatchObject({ 'user-id': 'user-id-value' });
  });

  it('keeps product, content, delta, and pagination plans on the single alias fallback', () => {
    const plan = runWithTenant([BULK_ACTION_TOOL, 'get-meeting-transcript-content'], () =>
      buildBulkPlan(
        {
          mode: 'preview',
          outputMode: 'summary',
          items: [
            {
              id: 'content-1',
              toolName: 'get-meeting-transcript-content',
              parameters: { meetingId: 'meeting', transcriptId: 'transcript' },
            },
          ],
        },
        { readOnly: false, orgMode: true, now: new Date('2026-06-05T00:00:00Z') }
      )
    );
    expect('error' in plan).toBe(false);
    if ('error' in plan) return;
    expect(plan.items[0].batchStrategy).toBe('single_alias_path');
  });

  it('previews generated aliases without exposing raw parameter values', () => {
    const plan = runWithTenant([BULK_ACTION_TOOL, READ_BULK_RESULT_TOOL, 'get-chat'], () =>
      buildBulkPlan(
        {
          mode: 'preview',
          outputMode: 'summary',
          items: [
            {
              id: 'read-1',
              toolName: 'get-chat',
              parameters: { chatId: 'secret-chat-id', select: ['id'] },
            },
          ],
        },
        { readOnly: false, orgMode: true, now: new Date('2026-06-05T00:00:00Z') }
      )
    );
    expect('error' in plan).toBe(false);
    if ('error' in plan) return;
    expect(plan.items[0]).toMatchObject({ id: 'read-1', toolName: 'get-chat', status: 'allowed' });
    const summary = bulkPlanPublicSummary(plan);
    expect(JSON.stringify(summary)).not.toContain('secret-chat-id');
    expect(JSON.stringify(summary)).toContain('parameterHash');
  });

  it('blocks raw request shapes and duplicate ids before execution', () => {
    const plan = runWithTenant([BULK_ACTION_TOOL, 'get-chat'], () =>
      buildBulkPlan(
        {
          mode: 'preview',
          outputMode: 'summary',
          items: [
            { id: 'dup', toolName: 'get-chat', parameters: { chatId: 'a' } },
            { id: 'dup', toolName: 'get-chat', parameters: { chatId: 'b' } },
            { id: 'raw', toolName: 'get-chat', parameters: { url: '/me' } },
          ],
        },
        { readOnly: false, orgMode: true, now: new Date('2026-06-05T00:00:00Z') }
      )
    );
    expect('error' in plan).toBe(false);
    if ('error' in plan) return;
    expect(plan.items.map((item) => item.code)).toEqual([
      undefined,
      'duplicate_item_id',
      'forbidden_raw_request_shape',
    ]);
  });

  it('reports read-only write policy instead of unknown tool', () => {
    const plan = runWithTenant([BULK_ACTION_TOOL, 'delete-onedrive-file'], () =>
      buildBulkPlan(
        {
          mode: 'preview',
          outputMode: 'summary',
          items: [
            {
              id: 'write-1',
              toolName: 'delete-onedrive-file',
              parameters: { driveId: 'drive-id', driveItemId: 'item-id' },
            },
          ],
        },
        { readOnly: true, orgMode: true, now: new Date('2026-06-05T00:00:00Z') }
      )
    );
    expect('error' in plan).toBe(false);
    if ('error' in plan) return;
    expect(plan.items[0]).toMatchObject({ status: 'blocked', code: 'read_only_violation' });
  });

  it('ignores caller-supplied confirmation expiry during preview', () => {
    const plan = runWithTenant([BULK_ACTION_TOOL, 'delete-onedrive-file'], () =>
      buildBulkPlan(
        {
          mode: 'preview',
          outputMode: 'summary',
          confirmation: {
            planDigest: 'attacker-digest',
            confirmed: true,
            expiresAt: '2099-01-01T00:00:00.000Z',
          },
          items: [
            {
              id: 'write-1',
              toolName: 'delete-onedrive-file',
              parameters: { driveId: 'drive', driveItemId: 'item' },
            },
          ],
        },
        { readOnly: false, orgMode: true, now: new Date('2026-06-05T00:00:00Z') }
      )
    );
    expect('error' in plan).toBe(false);
    if ('error' in plan) return;
    expect(plan.expiresAt).toBe('2026-06-05T00:10:00.000Z');
  });

  it('binds the confirmation expiry into the immutable plan digest', () => {
    const previewInput: BulkActionInput = {
      mode: 'preview',
      outputMode: 'summary',
      items: [
        {
          id: 'write-1',
          toolName: 'delete-onedrive-file',
          parameters: { driveId: 'drive', driveItemId: 'item' },
        },
      ],
    };
    const preview = runWithTenant([BULK_ACTION_TOOL, 'delete-onedrive-file'], () =>
      buildBulkPlan(previewInput, {
        readOnly: false,
        orgMode: true,
        now: new Date('2026-06-05T00:00:00Z'),
      })
    );
    expect('error' in preview).toBe(false);
    if ('error' in preview) return;
    expect(preview.requiresConfirmation).toBe(true);

    const forgedExecute = runWithTenant([BULK_ACTION_TOOL, 'delete-onedrive-file'], () =>
      buildBulkPlan(
        {
          ...previewInput,
          mode: 'execute',
          confirmation: {
            planDigest: preview.planDigest,
            confirmed: true,
            expiresAt: new Date(Date.parse(preview.expiresAt) + 60_000).toISOString(),
            signature: 'forged-signature',
          },
        },
        { readOnly: false, orgMode: true, now: new Date('2026-06-05T00:01:00Z') }
      )
    );
    expect('error' in forgedExecute).toBe(false);
    if ('error' in forgedExecute) return;
    expect(forgedExecute.planDigest).not.toBe(preview.planDigest);
  });

  it('keeps preview and execute digest stable when execute reuses preview expiry', () => {
    const previewInput: BulkActionInput = {
      mode: 'preview',
      outputMode: 'summary',
      items: [{ id: 'read-1', toolName: 'get-chat', parameters: { chatId: 'same' } }],
    };
    const preview = runWithTenant([BULK_ACTION_TOOL, 'get-chat'], () =>
      buildBulkPlan(previewInput, {
        readOnly: false,
        orgMode: true,
        now: new Date('2026-06-05T00:00:00Z'),
      })
    );
    expect('error' in preview).toBe(false);
    if ('error' in preview) return;
    const execute = runWithTenant([BULK_ACTION_TOOL, 'get-chat'], () =>
      buildBulkPlan(
        {
          ...previewInput,
          mode: 'execute',
          confirmation: {
            planDigest: preview.planDigest,
            confirmed: true,
            expiresAt: preview.expiresAt,
            signature: 'test-signature',
          },
        },
        {
          readOnly: false,
          orgMode: true,
          now: new Date('2026-06-05T00:01:00Z'),
          confirmationExpiresAt: preview.expiresAt,
        }
      )
    );
    expect('error' in execute).toBe(false);
    if ('error' in execute) return;
    expect(execute.planDigest).toBe(preview.planDigest);
  });
});
