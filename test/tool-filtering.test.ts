import { McpServer } from '@modelcontextprotocol/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GraphClient from '../src/graph-client.js';
import { registerGraphTools } from '../src/graph-tools.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../src/generated/client-beta.js', () => ({ api: { endpoints: [] } }));
vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'list-mail-messages',
        method: 'GET',
        path: '/me/messages',
        description: 'List mail messages',
      },
      { alias: 'send-mail', method: 'POST', path: '/me/sendMail', description: 'Send mail' },
      {
        alias: 'list-calendar-events',
        method: 'GET',
        path: '/me/events',
        description: 'List calendar events',
      },
      {
        alias: 'list-excel-worksheets',
        method: 'GET',
        path: '/workbook/worksheets',
        description: 'List Excel worksheets',
      },
      { alias: 'get-current-user', method: 'GET', path: '/me', description: 'Get current user' },
    ],
  },
}));

describe('Tool Filtering', () => {
  let server: McpServer;
  let graphClient: GraphClient;
  let registerToolSpy: ReturnType<typeof vi.spyOn>;

  const utilityNames = [
    'parse-teams-url',
    'download-bytes',
    'download-bytes-to-file',
    'get-download-url',
    'get-upload-url',
    'read-mail-text',
  ];
  const registeredNames = () => registerToolSpy.mock.calls.map(([name]) => name);

  beforeEach(() => {
    // Declared like src/server.ts does, so tools/call exists for the denied-tool audit hook
    server = new McpServer(
      { name: 'test', version: '1.0.0' },
      { capabilities: { tools: { listChanged: false } } }
    );
    graphClient = {} as GraphClient;
    registerToolSpy = vi
      .spyOn(server, 'registerTool')
      .mockImplementation(() => ({}) as ReturnType<McpServer['registerTool']>);
  });

  it('should register all tools when no filter is provided', () => {
    registerGraphTools(server, graphClient);

    // 5 mocked graph endpoints + 6 utilities, all via registerTool
    expect(registerToolSpy).toHaveBeenCalledTimes(11);
    expect(registeredNames()).toEqual(expect.arrayContaining(utilityNames));
    expect(registerToolSpy).toHaveBeenCalledWith(
      'list-mail-messages',
      expect.any(Object),
      expect.any(Function)
    );
    expect(registerToolSpy).toHaveBeenCalledWith(
      'send-mail',
      expect.any(Object),
      expect.any(Function)
    );
    expect(registerToolSpy).toHaveBeenCalledWith(
      'list-calendar-events',
      expect.any(Object),
      expect.any(Function)
    );
    expect(registerToolSpy).toHaveBeenCalledWith(
      'list-excel-worksheets',
      expect.any(Object),
      expect.any(Function)
    );
    expect(registerToolSpy).toHaveBeenCalledWith(
      'get-current-user',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should filter tools by regex pattern - mail only', () => {
    registerGraphTools(server, graphClient, { enabledTools: 'mail' });

    // The read-mail-text utility matches 'mail' too
    expect(registerToolSpy).toHaveBeenCalledTimes(3);
    expect(registerToolSpy).toHaveBeenCalledWith(
      'read-mail-text',
      expect.any(Object),
      expect.any(Function)
    );
    expect(registerToolSpy).toHaveBeenCalledWith(
      'list-mail-messages',
      expect.any(Object),
      expect.any(Function)
    );
    expect(registerToolSpy).toHaveBeenCalledWith(
      'send-mail',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should filter tools by regex pattern - calendar or excel', () => {
    registerGraphTools(server, graphClient, { enabledTools: 'calendar|excel' });

    expect(registerToolSpy).toHaveBeenCalledTimes(2);
    expect(registerToolSpy).toHaveBeenCalledWith(
      'list-calendar-events',
      expect.any(Object),
      expect.any(Function)
    );
    expect(registerToolSpy).toHaveBeenCalledWith(
      'list-excel-worksheets',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should handle invalid regex patterns gracefully', () => {
    registerGraphTools(server, graphClient, { enabledTools: '[invalid regex' });

    // 5 mocked endpoints + utilities (no filter applied on invalid regex)
    expect(registerToolSpy).toHaveBeenCalledTimes(11);
    expect(registeredNames()).toEqual(expect.arrayContaining(utilityNames));
  });

  it('should combine read-only and filtering correctly', () => {
    registerGraphTools(server, graphClient, { readOnly: true, enabledTools: 'mail' });

    // list-mail-messages plus the read-only read-mail-text utility
    expect(registerToolSpy).toHaveBeenCalledTimes(2);
    expect(registerToolSpy).not.toHaveBeenCalledWith(
      'send-mail',
      expect.any(Object),
      expect.any(Function)
    );
    expect(registerToolSpy).toHaveBeenCalledWith(
      'list-mail-messages',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should register no tools when pattern matches nothing', () => {
    registerGraphTools(server, graphClient, { enabledTools: 'nonexistent' });

    expect(registerToolSpy).toHaveBeenCalledTimes(0);
  });
});
