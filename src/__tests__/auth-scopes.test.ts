import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger
vi.mock('../logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock endpoints.json
let mockEndpointsJson: any[] = [];
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      mkdirSync: actual.mkdirSync,
      writeFileSync: actual.writeFileSync,
      existsSync: actual.existsSync,
      unlinkSync: actual.unlinkSync,
    },
    readFileSync: (filePath: string, encoding?: string) => {
      if (typeof filePath === 'string' && filePath.includes('endpoints.json')) {
        return JSON.stringify(mockEndpointsJson);
      }
      return actual.readFileSync(filePath, encoding as any);
    },
  };
});

// Mock cloud-config
vi.mock('../cloud-config.js', () => ({
  getCloudEndpoints: () => ({
    authority: 'https://login.microsoftonline.com',
    graphApi: 'https://graph.microsoft.com',
  }),
  getDefaultClientId: () => 'test-client-id',
}));

// Mock secrets
vi.mock('../secrets.js', () => ({
  getSecrets: async () => ({
    clientId: 'test-client-id',
    tenantId: 'common',
    cloudType: 'global',
  }),
}));

describe('buildScopesFromEndpoints', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.MS365_MCP_OAUTH_SCOPES;
    delete process.env.MS365_MCP_TENANT_ID;
    mockEndpointsJson = [
      {
        pathPattern: '/me/messages',
        method: 'GET',
        toolName: 'list-mail-messages',
        scopes: ['Mail.Read'],
      },
      {
        pathPattern: '/me/messages',
        method: 'POST',
        toolName: 'send-mail',
        scopes: ['Mail.Send'],
      },
      {
        pathPattern: '/me/joinedTeams',
        method: 'GET',
        toolName: 'list-teams',
        scopes: ['Team.ReadBasic.All'],
        workScopes: ['Group.Read.All'],
      },
      {
        pathPattern: '/me/calendars',
        method: 'GET',
        toolName: 'list-calendars',
        scopes: ['Calendars.Read'],
      },
      {
        pathPattern: '/me/contacts',
        method: 'GET',
        toolName: 'list-contacts',
        scopes: ['Contacts.Read'],
      },
    ];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  async function getBuildScopes() {
    const mod = await import('../auth.js');
    return mod.buildScopesFromEndpoints;
  }

  it('should build scopes from all endpoints by default', async () => {
    const buildScopesFromEndpoints = await getBuildScopes();
    const scopes = buildScopesFromEndpoints();
    expect(scopes).toContain('Mail.Read');
    expect(scopes).toContain('Mail.Send');
    expect(scopes).toContain('Team.ReadBasic.All');
    expect(scopes).toContain('Calendars.Read');
    expect(scopes).toContain('Contacts.Read');
  });

  it('should use MS365_MCP_OAUTH_SCOPES when set (space-separated)', async () => {
    process.env.MS365_MCP_OAUTH_SCOPES = 'Mail.Read User.Read Calendars.Read';
    const buildScopesFromEndpoints = await getBuildScopes();
    const scopes = buildScopesFromEndpoints();
    expect(scopes).toEqual(['Mail.Read', 'User.Read', 'Calendars.Read']);
  });

  it('should use MS365_MCP_OAUTH_SCOPES when set (comma-separated)', async () => {
    process.env.MS365_MCP_OAUTH_SCOPES = 'Mail.Read,User.Read,Calendars.Read';
    const buildScopesFromEndpoints = await getBuildScopes();
    const scopes = buildScopesFromEndpoints();
    expect(scopes).toEqual(['Mail.Read', 'User.Read', 'Calendars.Read']);
  });

  it('should ignore empty MS365_MCP_OAUTH_SCOPES', async () => {
    process.env.MS365_MCP_OAUTH_SCOPES = '   ';
    const buildScopesFromEndpoints = await getBuildScopes();
    const scopes = buildScopesFromEndpoints();
    // Should fall back to endpoint-based scopes
    expect(scopes).toContain('Mail.Read');
    expect(scopes.length).toBeGreaterThan(0);
  });

  it('should filter consumer-incompatible scopes when tenant is consumers', async () => {
    process.env.MS365_MCP_TENANT_ID = 'consumers';
    const buildScopesFromEndpoints = await getBuildScopes();
    const scopes = buildScopesFromEndpoints();
    expect(scopes).toContain('Mail.Read');
    expect(scopes).toContain('Mail.Send');
    expect(scopes).toContain('Calendars.Read');
    expect(scopes).toContain('Contacts.Read');
    // These should be filtered out for consumers
    expect(scopes).not.toContain('Team.ReadBasic.All');
  });

  it('should NOT filter scopes when tenant is common', async () => {
    process.env.MS365_MCP_TENANT_ID = 'common';
    const buildScopesFromEndpoints = await getBuildScopes();
    const scopes = buildScopesFromEndpoints();
    expect(scopes).toContain('Team.ReadBasic.All');
  });

  it('should NOT filter scopes when tenant is organizations', async () => {
    process.env.MS365_MCP_TENANT_ID = 'organizations';
    const buildScopesFromEndpoints = await getBuildScopes();
    const scopes = buildScopesFromEndpoints();
    expect(scopes).toContain('Team.ReadBasic.All');
  });

  it('should include workScopes when includeWorkAccountScopes is true and filter for consumers', async () => {
    process.env.MS365_MCP_TENANT_ID = 'consumers';
    const buildScopesFromEndpoints = await getBuildScopes();
    const scopes = buildScopesFromEndpoints(true);
    // workScopes like Group.Read.All should also be filtered for consumers
    expect(scopes).not.toContain('Group.Read.All');
    expect(scopes).not.toContain('Team.ReadBasic.All');
    // Regular compatible scopes should remain
    expect(scopes).toContain('Mail.Read');
  });

  it('should prioritize MS365_MCP_OAUTH_SCOPES over consumer filtering', async () => {
    process.env.MS365_MCP_TENANT_ID = 'consumers';
    process.env.MS365_MCP_OAUTH_SCOPES = 'Team.ReadBasic.All Mail.Read';
    const buildScopesFromEndpoints = await getBuildScopes();
    const scopes = buildScopesFromEndpoints();
    // Custom scopes should not be filtered - user knows what they're doing
    expect(scopes).toEqual(['Team.ReadBasic.All', 'Mail.Read']);
  });

  it('should filter all known consumer-incompatible scopes', async () => {
    mockEndpointsJson = [
      { pathPattern: '/test1', method: 'GET', toolName: 'test1', scopes: ['Channel.ReadBasic.All', 'ChannelMessage.Read.All', 'ChannelMessage.Send'] },
      { pathPattern: '/test2', method: 'GET', toolName: 'test2', scopes: ['Chat.Read', 'ChatMessage.Read', 'ChatMessage.Send'] },
      { pathPattern: '/test3', method: 'GET', toolName: 'test3', scopes: ['OnlineMeetings.Read', 'OnlineMeetingTranscript.Read.All'] },
      { pathPattern: '/test4', method: 'GET', toolName: 'test4', scopes: ['Sites.Read.All', 'Group.Read.All', 'Group.ReadWrite.All'] },
      { pathPattern: '/test5', method: 'GET', toolName: 'test5', scopes: ['User.Read.All', 'People.Read'] },
      { pathPattern: '/test6', method: 'GET', toolName: 'test6', scopes: ['Mail.Read.Shared', 'Mail.Send.Shared', 'Calendars.Read.Shared'] },
      { pathPattern: '/test7', method: 'GET', toolName: 'test7', scopes: ['Files.Read.All'] },
      { pathPattern: '/test8', method: 'GET', toolName: 'test8', scopes: ['User.Read', 'Mail.Read'] },
    ];
    process.env.MS365_MCP_TENANT_ID = 'consumers';
    const buildScopesFromEndpoints = await getBuildScopes();
    const scopes = buildScopesFromEndpoints();
    // Only consumer-compatible scopes should remain
    expect(scopes).toEqual(expect.arrayContaining(['User.Read', 'Mail.Read']));
    expect(scopes).toHaveLength(2);
  });
});
