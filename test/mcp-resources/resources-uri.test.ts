import { describe, expect, it } from 'vitest';
import { assertTenantResourceOwner, parseMcpResourceUri } from '../../src/lib/mcp-resources/uri.js';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

describe('Phase 8 Plan 08-10 - MCP resource URI parser', () => {
  it('parses canonical m365 catalog navigation guide URIs and mcp aliases', () => {
    expect(parseMcpResourceUri('m365://catalog/navigation-guide.md')).toEqual({
      ok: true,
      kind: 'catalog',
      path: 'navigation-guide.md',
    });
    expect(parseMcpResourceUri('mcp://catalog/navigation-guide.md')).toEqual({
      ok: true,
      kind: 'catalog',
      path: 'navigation-guide.md',
    });
  });

  it('parses catalog workload guide URIs and extracts the workload slug', () => {
    expect(parseMcpResourceUri('m365://catalog/workloads/mail.md')).toEqual({
      ok: true,
      kind: 'catalog',
      path: 'workloads/mail.md',
      workloadSlug: 'mail',
    });
  });

  it('parses endpoint schema URIs and extracts the endpoint alias', () => {
    expect(parseMcpResourceUri('m365://endpoint/list-mail-messages.schema.json')).toEqual({
      ok: true,
      kind: 'endpoint',
      alias: 'list-mail-messages',
    });
  });

  it('parses tenant resource URIs and extracts tenant id plus resource view', () => {
    expect(parseMcpResourceUri(`m365://tenant/${TENANT_A}/bookmarks.json`)).toEqual({
      ok: true,
      kind: 'tenant',
      tenantId: TENANT_A,
      view: 'bookmarks',
      path: 'bookmarks.json',
    });

    expect(parseMcpResourceUri(`m365://tenant/${TENANT_A}/audit/recent.json`)).toEqual({
      ok: true,
      kind: 'tenant',
      tenantId: TENANT_A,
      view: 'audit/recent',
      path: 'audit/recent.json',
    });
  });

  it('parses connector diagnostics and capability resources', () => {
    expect(parseMcpResourceUri(`m365://tenant/${TENANT_A}/connector/capabilities.json`)).toEqual({
      ok: true,
      kind: 'connector',
      tenantId: TENANT_A,
      view: 'connector/capabilities',
      path: 'connector/capabilities.json',
    });
    expect(parseMcpResourceUri(`m365://tenant/${TENANT_A}/connector/diagnostics.json`)).toEqual({
      ok: true,
      kind: 'connector',
      tenantId: TENANT_A,
      view: 'connector/diagnostics',
      path: 'connector/diagnostics.json',
    });
  });

  it('parses Graph-backed tenant resource URIs', () => {
    expect(parseMcpResourceUri(`m365://tenant/${TENANT_A}/mail/messages/message-1.json`)).toEqual({
      ok: true,
      kind: 'graph',
      tenantId: TENANT_A,
      graphKind: 'mail-message',
      ids: { messageId: 'message-1' },
      path: 'mail/messages/message-1.json',
    });
    expect(
      parseMcpResourceUri(`m365://tenant/${TENANT_A}/teams/team-1/channels/channel-1.json`)
    ).toEqual({
      ok: true,
      kind: 'graph',
      tenantId: TENANT_A,
      graphKind: 'team-channel',
      ids: { teamId: 'team-1', channelId: 'channel-1' },
      path: 'teams/team-1/channels/channel-1.json',
    });
  });

  it('rejects invalid schemes, decorators, dot segments, and unknown path families', () => {
    expect(parseMcpResourceUri('https://catalog/navigation-guide.md')).toMatchObject({
      ok: false,
      code: 'invalid_scheme',
    });
    for (const uri of [
      'm365://catalog/../navigation-guide.md',
      'm365://user:pass@catalog/navigation-guide.md',
      'm365://catalog/navigation-guide.md?x=1',
      'm365://catalog/navigation-guide.md#frag',
    ]) {
      expect(parseMcpResourceUri(uri)).toMatchObject({
        ok: false,
        code: 'invalid_resource_uri',
      });
    }
    expect(parseMcpResourceUri('m365://endpoint/.schema.json')).toMatchObject({
      ok: false,
      code: 'invalid_resource_uri',
    });
    expect(parseMcpResourceUri(`m365://tenant/${TENANT_A}/unknown.json`)).toMatchObject({
      ok: false,
      code: 'invalid_resource_uri',
    });
  });

  it('enforces tenant URI ownership with one client-safe mismatch code', () => {
    const parsed = parseMcpResourceUri(`m365://tenant/${TENANT_A}/bookmarks.json`);
    const graph = parseMcpResourceUri(`m365://tenant/${TENANT_A}/users/user-1.json`);

    expect(assertTenantResourceOwner(parsed, TENANT_A)).toEqual(parsed);
    expect(assertTenantResourceOwner(parsed, TENANT_B)).toMatchObject({
      ok: false,
      code: 'tenant_resource_mismatch',
    });
    expect(assertTenantResourceOwner(parsed, undefined)).toMatchObject({
      ok: false,
      code: 'tenant_resource_mismatch',
    });
    expect(assertTenantResourceOwner(graph, TENANT_B)).toMatchObject({
      ok: false,
      code: 'tenant_resource_mismatch',
    });
  });
});
