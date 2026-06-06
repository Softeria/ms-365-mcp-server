import { describe, expect, it } from 'vitest';
import { graphResourceLinksForToolResult } from '../../src/lib/mcp-resources/graph-backed.js';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const MESSAGE_DATA = { value: [{ id: 'message-1', subject: 'Hello' }] };

describe('Graph-backed resource link authorization', () => {
  it('does not advertise mail message resource links when the backing get tool is disabled', () => {
    const links = graphResourceLinksForToolResult({
      toolName: 'list-mail-messages',
      tenantId: TENANT_ID,
      data: MESSAGE_DATA,
      tenant: {
        enabled_tools: 'list-mail-messages',
        enabled_tools_set: new Set(['list-mail-messages']),
        preset_version: 'essentials-v1',
        allowed_scopes: ['Mail.Read'],
      },
    });

    expect(links).toEqual([]);
  });

  it('advertises mail message resource links only when the backing get tool and scope are enabled', () => {
    const links = graphResourceLinksForToolResult({
      toolName: 'list-mail-messages',
      tenantId: TENANT_ID,
      data: MESSAGE_DATA,
      tenant: {
        enabled_tools: 'list-mail-messages,get-mail-message',
        enabled_tools_set: new Set(['list-mail-messages', 'get-mail-message']),
        preset_version: 'essentials-v1',
        allowed_scopes: ['Mail.Read'],
      },
    });

    expect(links).toEqual([
      {
        uri: `m365://tenant/${TENANT_ID}/mail/messages/message-1.json`,
        name: 'Mail message resource',
        mimeType: 'application/json',
        description: 'Durable mail message resource link.',
      },
    ]);
  });

  it('keeps discovery-v1 explicit Graph allowlists from advertising unreadable backing resources', () => {
    const links = graphResourceLinksForToolResult({
      toolName: 'list-mail-messages',
      tenantId: TENANT_ID,
      data: MESSAGE_DATA,
      tenant: {
        enabled_tools: 'list-mail-messages',
        enabled_tools_set: new Set(['list-mail-messages']),
        preset_version: 'discovery-v1',
        allowed_scopes: ['Mail.Read'],
      },
    });

    expect(links).toEqual([]);
  });
});
