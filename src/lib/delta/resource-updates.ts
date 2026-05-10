import { graphResourceUri, type ResourceUpdate } from '../mcp-notifications/resource-updates.js';
import type { NotificationItem } from '../admin/webhooks.js';

const MAIL_MESSAGE_RESOURCE = /(?:^|\/)messages\/([^/?#]+)$/;

export function mapGraphNotificationToResourceUpdates(
  tenantId: string,
  notification: Pick<NotificationItem, 'resource' | 'changeType'>
): ResourceUpdate[] {
  const match = MAIL_MESSAGE_RESOURCE.exec(notification.resource);
  if (!match) return [];

  return [
    {
      uri: graphResourceUri(tenantId, `mail/messages/${encodeURIComponent(match[1])}.json`),
      source: 'graph-webhook',
      reason: 'graph-change',
      changeType: notification.changeType || 'updated',
    },
  ];
}
