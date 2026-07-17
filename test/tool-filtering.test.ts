import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGraphTools } from '../src/graph-tools.js';
import GraphClient from '../src/graph-client.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
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
  let toolSpy: ReturnType<typeof vi.spyOn>;
  let registerToolSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '1.0.0' });
    graphClient = {} as GraphClient;
    toolSpy = vi.spyOn(server, 'tool').mockImplementation(() => {});
    registerToolSpy = vi
      .spyOn(server, 'registerTool')
      .mockImplementation(() => ({}) as ReturnType<McpServer['registerTool']>);
  });

  it('should register all tools when no filter is provided', () => {
    registerGraphTools(server, graphClient, false);

    // 5 mocked graph endpoints via registerTool; utilities via tool
    expect(registerToolSpy).toHaveBeenCalledTimes(5);
    expect(toolSpy).toHaveBeenCalledTimes(3);
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
    registerGraphTools(server, graphClient, false, 'mail');

    expect(registerToolSpy).toHaveBeenCalledTimes(2);
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
    registerGraphTools(server, graphClient, false, 'calendar|excel');

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
    registerGraphTools(server, graphClient, false, '[invalid regex');

    // 5 mocked endpoints + utilities (no filter applied on invalid regex)
    expect(registerToolSpy).toHaveBeenCalledTimes(5);
    expect(toolSpy).toHaveBeenCalledTimes(3);
  });

  it('should combine read-only and filtering correctly', () => {
    registerGraphTools(server, graphClient, true, 'mail');

    expect(registerToolSpy).toHaveBeenCalledTimes(1);
    expect(registerToolSpy).toHaveBeenCalledWith(
      'list-mail-messages',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should register no tools when pattern matches nothing', () => {
    registerGraphTools(server, graphClient, false, 'nonexistent');

    expect(registerToolSpy).toHaveBeenCalledTimes(0);
    expect(toolSpy).toHaveBeenCalledTimes(0);
  });
});
