/**
 * --user-fields must treat a path the way Graph routes it. Each target below reaches the same
 * resource as its plain spelling, so each must meet the same restriction.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerGraphTools } from '../src/graph-tools.js';
import {
  restrictUserFieldUrl,
  stripUserFieldExpandFromUrl,
  userFieldEnforcement,
} from '../src/lib/user-field-policy.js';
import type GraphClient from '../src/graph-client.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), verbose: vi.fn() },
  enableConsoleLogging: vi.fn(),
}));

const graphRequest = vi.fn();
const graphClient = {
  graphRequest,
  downloadStream: vi.fn(),
  makeRequest: vi.fn(),
} as unknown as GraphClient;

async function connect(tools: string): Promise<Client> {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  registerGraphTools(server, graphClient, {
    enabledTools: tools,
    httpMode: false,
    userFields: 'id,displayName',
  });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await server.connect(s);
  const client = new Client({ name: 'c', version: '1.0.0' });
  await client.connect(c);
  return client;
}

type Result = { isError?: boolean; content: Array<{ text: string }> };

describe('passthrough refusal sees through percent-encoding', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    '/me/manager',
    '/me/manage%72',
    '/%75sers/abc',
    '/users/abc/manage%72',
    '/%2575sers/abc',
    '/users/a%2Fb',
    '/users%2Fabc/messages',
  ])('download-bytes refuses %s', async (target) => {
    const client = await connect('^download-bytes$');
    const result = (await client.callTool({
      name: 'download-bytes',
      arguments: { target },
    })) as Result;
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('user_fields_restricted');
  });

  it('still lets an unrelated byte path through', async () => {
    const client = await connect('^download-bytes$');
    const result = (await client.callTool({
      name: 'download-bytes',
      arguments: { target: '/me/messages/AAA/attachments/BBB/$value' },
    })) as Result;
    expect(result.content[0].text).not.toContain('user_fields_restricted');
  });
});

describe('graph-batch sub-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    graphRequest.mockResolvedValue({ content: [{ type: 'text', text: '{"responses":[]}' }] });
  });

  async function sentUrls(urls: string[]): Promise<string[]> {
    const client = await connect('^graph-batch$');
    await client.callTool({
      name: 'graph-batch',
      arguments: {
        body: { requests: urls.map((url, i) => ({ id: String(i), method: 'GET', url })) },
      },
    });
    const options = graphRequest.mock.calls[0][1] as { body: string | { requests: unknown[] } };
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    return (body.requests as Array<{ url: string }>).map((r) => r.url);
  }

  it('rewrites an encoded /users path to the allowlist', async () => {
    const [url] = await sentUrls(['/%75sers?$select=employeeId']);
    expect(url).toContain('$select=id,displayName');
    expect(url).not.toContain('employeeId');
  });

  it('removes $expand under any casing from /me', async () => {
    const urls = await sentUrls(['/me?$EXPAND=manager', '/me?expand=manager']);
    for (const url of urls) expect(url.toLowerCase()).not.toContain('expand');
  });
});

describe('classifier and rewriter details', () => {
  it('handles $Select and select variants in a batch URL', () => {
    for (const q of ['$Select=employeeId', 'select=employeeId', '$SELECT=employeeId']) {
      const { url } = restrictUserFieldUrl(`/users?${q}`, ['id'], 'request-and-response');
      expect(url).toBe('/users?$select=id');
    }
  });

  it('strips expand variants from /me', () => {
    expect(stripUserFieldExpandFromUrl('/me?$EXPAND=manager')).toBe('/me');
    expect(stripUserFieldExpandFromUrl('/me?expand=manager')).toBe('/me');
  });

  it('fails closed on an encoded separator, and does not abort on a stray %', () => {
    expect(userFieldEnforcement('/users/a%2Fb')).toBe('request-and-response');
    expect(userFieldEnforcement('/users/a%5Cb')).toBe('request-and-response');
    expect(userFieldEnforcement('/drives/x/root:/100%.docx:/content')).toBe('none');
    expect(userFieldEnforcement('/%75sers/%')).toBe('request-and-response');
  });

  it('only classifies: the batch URL that is sent keeps its own spelling', () => {
    const { url } = restrictUserFieldUrl('/%75sers?$select=id', ['id'], 'request-and-response');
    expect(url.startsWith('/%75sers?')).toBe(true);
  });
});
