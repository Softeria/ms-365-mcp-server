import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import GraphClient from './graph-client.js';
import logger from './logger.js';

const MAX_BATCH_SIZE = 20;

interface BatchRequest {
  id: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

interface BatchResponseItem {
  id: string;
  status: number;
  body?: unknown;
}

interface BatchResponse {
  responses: BatchResponseItem[];
}

async function executeBatch(
  graphClient: GraphClient,
  requests: BatchRequest[]
): Promise<BatchResponse> {
  if (requests.length === 0) {
    return { responses: [] };
  }

  if (requests.length > MAX_BATCH_SIZE) {
    throw new Error(`Batch size exceeds maximum of ${MAX_BATCH_SIZE} requests`);
  }

  const response = await graphClient.graphRequest('/$batch', {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });

  // Parse the response
  const text = response.content[0]?.text;
  if (!text) {
    throw new Error('Empty response from batch endpoint');
  }

  return JSON.parse(text) as BatchResponse;
}

function formatBatchResult(batchResponse: BatchResponse): {
  success: string[];
  failed: Array<{ id: string; status: number; error?: unknown }>;
  summary: string;
} {
  const success: string[] = [];
  const failed: Array<{ id: string; status: number; error?: unknown }> = [];

  for (const resp of batchResponse.responses) {
    // 2xx and 204 (No Content) are success
    if (resp.status >= 200 && resp.status < 300) {
      success.push(resp.id);
    } else {
      failed.push({
        id: resp.id,
        status: resp.status,
        error: resp.body,
      });
    }
  }

  const summary = `${success.length} succeeded, ${failed.length} failed`;
  return { success, failed, summary };
}

export function registerBatchTools(server: McpServer, graphClient: GraphClient): void {
  server.tool(
    'batch-delete-messages',
    'Delete multiple email messages in a single batch request (max 20). More efficient than individual deletes.',
    {
      messageIds: z
        .array(z.string())
        .min(1)
        .max(MAX_BATCH_SIZE)
        .describe('Array of message IDs to delete (max 20)'),
    },
    async ({ messageIds }) => {
      try {
        logger.info(`batch-delete-messages called with ${messageIds.length} messages`);

        const requests: BatchRequest[] = messageIds.map((id, index) => ({
          id: String(index + 1),
          method: 'DELETE',
          url: `/me/messages/${id}`,
        }));

        const batchResponse = await executeBatch(graphClient, requests);
        const result = formatBatchResult(batchResponse);

        // Map back to original message IDs
        const successIds = result.success.map((idx) => messageIds[parseInt(idx) - 1]);
        const failedDetails = result.failed.map((f) => ({
          messageId: messageIds[parseInt(f.id) - 1],
          status: f.status,
          error: f.error,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                summary: result.summary,
                deleted: successIds,
                failed: failedDetails,
              }),
            },
          ],
        };
      } catch (error) {
        logger.error(`batch-delete-messages failed: ${error}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Batch delete failed: ${(error as Error).message}` }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'batch-move-messages',
    'Move multiple email messages to a folder in a single batch request (max 20). Use list-mail-folders to get folder IDs.',
    {
      messageIds: z
        .array(z.string())
        .min(1)
        .max(MAX_BATCH_SIZE)
        .describe('Array of message IDs to move (max 20)'),
      destinationFolderId: z
        .string()
        .describe('ID of the destination folder. Use list-mail-folders to find folder IDs.'),
    },
    async ({ messageIds, destinationFolderId }) => {
      try {
        logger.info(
          `batch-move-messages called with ${messageIds.length} messages to folder ${destinationFolderId}`
        );

        const requests: BatchRequest[] = messageIds.map((id, index) => ({
          id: String(index + 1),
          method: 'POST',
          url: `/me/messages/${id}/move`,
          headers: { 'Content-Type': 'application/json' },
          body: { destinationId: destinationFolderId },
        }));

        const batchResponse = await executeBatch(graphClient, requests);
        const result = formatBatchResult(batchResponse);

        const successIds = result.success.map((idx) => messageIds[parseInt(idx) - 1]);
        const failedDetails = result.failed.map((f) => ({
          messageId: messageIds[parseInt(f.id) - 1],
          status: f.status,
          error: f.error,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                summary: result.summary,
                moved: successIds,
                destinationFolderId,
                failed: failedDetails,
              }),
            },
          ],
        };
      } catch (error) {
        logger.error(`batch-move-messages failed: ${error}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Batch move failed: ${(error as Error).message}` }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'batch-archive-messages',
    'Archive multiple email messages in a single batch request (max 20). Moves messages to the Archive folder.',
    {
      messageIds: z
        .array(z.string())
        .min(1)
        .max(MAX_BATCH_SIZE)
        .describe('Array of message IDs to archive (max 20)'),
    },
    async ({ messageIds }) => {
      try {
        logger.info(`batch-archive-messages called with ${messageIds.length} messages`);

        // Archive folder has well-known name "archive"
        // Graph API accepts well-known folder names directly
        const requests: BatchRequest[] = messageIds.map((id, index) => ({
          id: String(index + 1),
          method: 'POST',
          url: `/me/messages/${id}/move`,
          headers: { 'Content-Type': 'application/json' },
          body: { destinationId: 'archive' },
        }));

        const batchResponse = await executeBatch(graphClient, requests);
        const result = formatBatchResult(batchResponse);

        const successIds = result.success.map((idx) => messageIds[parseInt(idx) - 1]);
        const failedDetails = result.failed.map((f) => ({
          messageId: messageIds[parseInt(f.id) - 1],
          status: f.status,
          error: f.error,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                summary: result.summary,
                archived: successIds,
                failed: failedDetails,
              }),
            },
          ],
        };
      } catch (error) {
        logger.error(`batch-archive-messages failed: ${error}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Batch archive failed: ${(error as Error).message}` }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'batch-mark-read',
    'Mark multiple email messages as read or unread in a single batch request (max 20).',
    {
      messageIds: z
        .array(z.string())
        .min(1)
        .max(MAX_BATCH_SIZE)
        .describe('Array of message IDs to update (max 20)'),
      isRead: z.boolean().describe('true to mark as read, false to mark as unread'),
    },
    async ({ messageIds, isRead }) => {
      try {
        logger.info(
          `batch-mark-read called with ${messageIds.length} messages, isRead=${isRead}`
        );

        const requests: BatchRequest[] = messageIds.map((id, index) => ({
          id: String(index + 1),
          method: 'PATCH',
          url: `/me/messages/${id}`,
          headers: { 'Content-Type': 'application/json' },
          body: { isRead },
        }));

        const batchResponse = await executeBatch(graphClient, requests);
        const result = formatBatchResult(batchResponse);

        const successIds = result.success.map((idx) => messageIds[parseInt(idx) - 1]);
        const failedDetails = result.failed.map((f) => ({
          messageId: messageIds[parseInt(f.id) - 1],
          status: f.status,
          error: f.error,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                summary: result.summary,
                updated: successIds,
                markedAs: isRead ? 'read' : 'unread',
                failed: failedDetails,
              }),
            },
          ],
        };
      } catch (error) {
        logger.error(`batch-mark-read failed: ${error}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Batch mark read failed: ${(error as Error).message}`,
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
