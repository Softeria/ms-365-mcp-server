import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';

/**
 * We test executeGraphTool logic by importing it indirectly through registerGraphTools.
 * Strategy: mock GraphClient, create a real McpServer, register tools, then invoke them.
 */

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

// Mock logger to silence output
vi.mock('../logger.js', () => ({
  default: loggerMock,
}));

const auditLogMock = vi.hoisted(() => vi.fn());
vi.mock('../audit-log.js', async () => {
  const actual = await vi.importActual<typeof import('../audit-log.js')>('../audit-log.js');
  return {
    ...actual,
    auditLog: auditLogMock,
  };
});

// Mock the generated client — we supply our own endpoint definitions per test
const mockEndpoints: any[] = [];
vi.mock('../generated/client-beta.js', () => ({ api: { endpoints: [] } }));
vi.mock('../generated/client.js', () => ({
  api: {
    get endpoints() {
      return mockEndpoints;
    },
  },
}));

// Mock endpoints.json — we supply our own config per test
let mockEndpointsJson: any[] = [];
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    readFileSync: (filePath: string, encoding?: string) => {
      if (typeof filePath === 'string' && filePath.includes('endpoints.json')) {
        return JSON.stringify(mockEndpointsJson);
      }
      return actual.readFileSync(filePath, encoding as any);
    },
  };
});

// Mock tool-categories
vi.mock('../tool-categories.js', () => ({
  TOOL_CATEGORIES: {},
}));

// ---------- helpers ----------

function makeEndpoint(overrides: Partial<any> = {}) {
  return {
    method: 'get',
    path: '/me/messages',
    alias: 'test-tool',
    description: 'Test tool',
    requestFormat: 'json' as const,
    parameters: [
      { name: 'filter', type: 'Query', schema: z.string().optional() },
      { name: 'search', type: 'Query', schema: z.string().optional() },
      { name: 'select', type: 'Query', schema: z.string().optional() },
      { name: 'orderby', type: 'Query', schema: z.string().optional() },
      { name: 'expand', type: 'Query', schema: z.string().optional() },
      { name: 'count', type: 'Query', schema: z.boolean().optional() },
      { name: 'top', type: 'Query', schema: z.number().optional() },
      { name: 'skip', type: 'Query', schema: z.number().optional() },
    ],
    response: z.any(),
    ...overrides,
  };
}

function makeConfig(overrides: Partial<any> = {}) {
  return {
    pathPattern: '/me/messages',
    method: 'get',
    toolName: 'test-tool',
    scopes: ['Mail.Read'],
    ...overrides,
  };
}

/** Creates a mock GraphClient with a controllable graphRequest spy */
function createMockGraphClient(responses?: any[], outputFormat: 'json' | 'toon' = 'json') {
  const responseQueue = [...(responses || [])];
  return {
    graphRequest: vi.fn().mockImplementation(async () => {
      if (responseQueue.length > 0) {
        return responseQueue.shift();
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ value: [] }) }],
      };
    }),
    // Fake serialize: prefix the JSON in toon mode so a test can tell the merged
    // body went through serialize() and not a plain JSON.stringify.
    serialize: vi
      .fn()
      .mockImplementation((data: unknown) =>
        outputFormat === 'toon' ? `TOON:${JSON.stringify(data)}` : JSON.stringify(data)
      ),
  };
}

/**
 * Because registerGraphTools reads endpointsData at module load time,
 * and we mock fs.readFileSync, we need to re-import after setting mocks.
 */
async function loadModule() {
  // Clear cached module so mocks take effect
  vi.resetModules();
  const mod = await import('../graph-tools.js');
  return mod;
}

/** Minimal McpServer mock that captures registered tools */
function createMockServer() {
  const tools = new Map<
    string,
    { description: string; schema: any; handler: (...args: any[]) => any }
  >();
  const requestHandlers = new Map<string, (request: unknown, extra: unknown) => Promise<unknown>>();
  const installDefaultToolCallHandler = () => {
    if (requestHandlers.has('tools/call')) return;
    requestHandlers.set('tools/call', async (request: unknown) => {
      const params = (request as { params?: { name?: string; arguments?: unknown } }).params;
      const toolName = params?.name ?? 'unknown';
      const tool = tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} not found`);
      }
      return tool.handler(params?.arguments ?? {});
    });
  };
  const lowLevelServer = {
    _requestHandlers: requestHandlers,
    setRequestHandler: vi.fn(
      (_schema: unknown, handler: (request: unknown, extra: unknown) => Promise<unknown>) => {
        requestHandlers.set('tools/call', handler);
      }
    ),
  };
  return {
    server: lowLevelServer,
    tool: vi.fn(
      (
        name: string,
        description: string,
        schema: any,
        annotations: any,
        handler: (...args: any[]) => any
      ) => {
        tools.set(name, { description, schema, handler });
        installDefaultToolCallHandler();
      }
    ),
    registerTool: vi.fn(
      (
        name: string,
        config: { description: string; inputSchema: any },
        handler: (...args: any[]) => any
      ) => {
        // Expose the zod object's shape so tests can keep asserting on params
        tools.set(name, {
          description: config.description,
          schema: config.inputSchema?.shape ?? config.inputSchema,
          handler,
        });
        installDefaultToolCallHandler();
      }
    ),
    tools,
  };
}

function makeJwt(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${body}.signature`;
}

// ========== TESTS ==========

describe('graph-tools', () => {
  beforeEach(() => {
    mockEndpoints.length = 0;
    mockEndpointsJson = [];
    vi.clearAllMocks();
  });

  // ---- 0. Audit outcome metadata ----
  describe('audit outcome metadata', () => {
    it('includes HTTP status on successful Graph tool calls', async () => {
      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        {
          content: [{ type: 'text', text: JSON.stringify({ value: [] }) }],
          _meta: { http_status: 200 },
        },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(
        server as unknown as Parameters<typeof registerGraphTools>[0],
        graphClient as unknown as Parameters<typeof registerGraphTools>[1]
      );

      await server.tools.get('test-tool')!.handler({});

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.call',
          tool: 'test-tool',
          status: 'success',
          http_status: 200,
        })
      );
    });

    it('includes HTTP status and Graph error code on failed Graph tool calls', async () => {
      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Microsoft Graph API error: 403 Forbidden' }),
            },
          ],
          isError: true,
          _meta: { http_status: 403, error_code: 'accessDenied' },
        },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      await server.tools.get('test-tool')!.handler({});

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.call',
          tool: 'test-tool',
          status: 'error',
          http_status: 403,
          error_code: 'accessDenied',
        })
      );
    });

    it('includes HTTP status on utility tool calls that reach Graph', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                contentType: 'image/jpeg',
                encoding: 'base64',
                contentBytes: 'aGk=',
              }),
            },
          ],
          _meta: { http_status: 200 },
        }),
      };

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      await server.tools.get('download-bytes')!.handler({ target: '/me/photo/$value' });

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.call',
          tool: 'download-bytes',
          status: 'success',
          http_method: 'GET',
          http_status: 200,
        })
      );
    });

    it('includes HTTP status and Graph error code on failed utility Graph calls', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Microsoft Graph API error: 403 Forbidden' }),
            },
          ],
          isError: true,
          _meta: { http_status: 403, error_code: 'accessDenied' },
        }),
      };

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      await server.tools.get('download-bytes')!.handler({ target: '/me/photo/$value' });

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.call',
          tool: 'download-bytes',
          status: 'error',
          http_status: 403,
          error_code: 'accessDenied',
        })
      );
    });

    it('copies Graph batch outcome metadata into audit events', async () => {
      const endpoint = makeEndpoint({
        method: 'post',
        path: '/$batch',
        alias: 'graph-batch',
        parameters: [{ name: 'body', type: 'Body', schema: z.object({}).passthrough() }],
      });
      const config = makeConfig({
        pathPattern: '/$batch',
        method: 'post',
        toolName: 'graph-batch',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                responses: [
                  { id: '1', status: 200, body: { id: 'message-1' } },
                  {
                    id: '2',
                    status: 403,
                    body: { error: { code: 'accessDenied', message: 'Access denied' } },
                  },
                ],
              }),
            },
          ],
          _meta: {
            http_status: 200,
            graph_batch_subrequest_count: 2,
            graph_batch_http_status_counts: { '200': 1, '403': 1 },
            graph_batch_error_code_counts: { accessDenied: 1 },
          },
        },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(
        server as unknown as Parameters<typeof registerGraphTools>[0],
        graphClient as unknown as Parameters<typeof registerGraphTools>[1]
      );

      await server.tools.get('graph-batch')!.handler({
        body: { requests: [{ id: '1', method: 'GET', url: '/me' }] },
      });

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.call',
          tool: 'graph-batch',
          status: 'success',
          http_status: 200,
          graph_batch_subrequest_count: 2,
          graph_batch_http_status_counts: { '200': 1, '403': 1 },
          graph_batch_error_code_counts: { accessDenied: 1 },
        })
      );
    });
  });

  describe('audit recipient metadata', () => {
    const draftEndpoint = () => {
      const endpoint = makeEndpoint({
        method: 'post',
        path: '/me/messages',
        alias: 'create-draft-email',
        parameters: [{ name: 'body', type: 'Body', schema: z.object({}).passthrough() }],
      });
      const config = makeConfig({
        pathPattern: '/me/messages',
        method: 'post',
        toolName: 'create-draft-email',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];
    };

    const runDraft = async (body: unknown) => {
      const graphClient = createMockGraphClient([
        {
          content: [{ type: 'text', text: JSON.stringify({ id: 'draft-1' }) }],
          _meta: { http_status: 201 },
        },
      ]);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(
        server as unknown as Parameters<typeof registerGraphTools>[0],
        graphClient as unknown as Parameters<typeof registerGraphTools>[1]
      );
      await server.tools.get('create-draft-email')!.handler({ body });
      return auditLogMock.mock.calls[0][0];
    };

    it('records recipient count and domains, deduplicated and sorted', async () => {
      draftEndpoint();
      const payload = await runDraft({
        toRecipients: [
          { emailAddress: { address: 'someone@example.com' } },
          { emailAddress: { address: 'Another@Example.com' } },
        ],
        ccRecipients: [{ emailAddress: { address: 'auditor@partner.co.uk' } }],
      });

      expect(payload).toMatchObject({
        tool: 'create-draft-email',
        recipient_count: 3,
        recipient_domains: ['example.com', 'partner.co.uk'],
      });
    });

    it('reads recipients nested under a camelCase message, as createReply sends them', async () => {
      draftEndpoint();
      const payload = await runDraft({
        comment: 'forwarding this on',
        message: { toRecipients: [{ emailAddress: { address: 'outside@gmail.com' } }] },
      });

      expect(payload).toMatchObject({ recipient_count: 1, recipient_domains: ['gmail.com'] });
    });

    it('reads PascalCase fields, as the Graph action endpoints send them', async () => {
      draftEndpoint();
      // POST /me/messages/{id}/forward and /me/sendMail use ToRecipients / Message,
      // unlike POST /me/messages which uses toRecipients.
      const payload = await runDraft({
        Comment: 'fyi',
        ToRecipients: [{ emailAddress: { address: 'partner@vendor.com' } }],
        Message: { CcRecipients: [{ emailAddress: { address: 'watcher@vendor.com' } }] },
      });

      expect(payload).toMatchObject({ recipient_count: 2, recipient_domains: ['vendor.com'] });
    });

    it('records calendar attendees, not just mail recipients', async () => {
      draftEndpoint();
      const payload = await runDraft({
        subject: 'sync',
        attendees: [
          { emailAddress: { address: 'colleague@example.com' }, type: 'required' },
          { emailAddress: { address: 'guest@external.org' }, type: 'optional' },
        ],
      });

      expect(payload).toMatchObject({
        recipient_count: 2,
        recipient_domains: ['example.com', 'external.org'],
      });
    });

    it('logs domains only, never the local part of an address', async () => {
      draftEndpoint();
      const payload = await runDraft({
        toRecipients: [{ emailAddress: { address: 'confidential.name@example.com' } }],
      });

      expect(payload.recipient_domains).toEqual(['example.com']);
      expect(JSON.stringify(payload)).not.toContain('confidential.name');
    });

    it('rejects a tail that is not a plain hostname', async () => {
      draftEndpoint();
      const payload = await runDraft({
        toRecipients: [
          { emailAddress: { address: 'a@example.com/path' } },
          { emailAddress: { address: 'b@evil<script' } },
          { emailAddress: { address: 'c@example.com,comment' } },
          { emailAddress: { address: 'd@[IPv6:2001:db8::1]' } },
          { emailAddress: { address: 'e@good.example' } },
        ],
      });

      expect(payload.recipient_count).toBe(5);
      expect(payload.recipient_domains).toEqual(['good.example']);
    });

    it('drops a domain longer than a hostname can be', async () => {
      draftEndpoint();
      const payload = await runDraft({
        toRecipients: [
          { emailAddress: { address: `a@${'x'.repeat(300)}.example` } },
          { emailAddress: { address: 'b@ext.com' } },
        ],
      });

      // The cap bounds how many domains land in a record, not how long each one is, so
      // without a length check one address picks the size of the audit line
      expect(payload.recipient_count).toBe(2);
      expect(payload.recipient_domains).toEqual(['ext.com']);
    });

    it('counts an entry that names someone without an address', async () => {
      draftEndpoint();
      const payload = await runDraft({
        recipients: [{ alias: 'finance-team' }, { objectId: 'abc-123' }],
      });

      expect(payload.recipient_count).toBe(2);
      expect(payload).not.toHaveProperty('recipient_domains');
    });

    it('walks a body forwarded to Graph as a raw JSON string', async () => {
      // Needs a strict schema: a passthrough one wraps the string instead, so the
      // raw-string path never fires. When both parses fail, real mail goes out.
      mockEndpoints.push(
        makeEndpoint({
          method: 'post',
          path: '/me/sendMail',
          alias: 'send-mail',
          parameters: [
            {
              name: 'body',
              type: 'Body',
              schema: z.object({ message: z.object({}).passthrough() }),
            },
          ],
        })
      );
      mockEndpointsJson = [
        makeConfig({ pathPattern: '/me/sendMail', method: 'post', toolName: 'send-mail' }),
      ];

      const graphClient = createMockGraphClient([
        {
          content: [{ type: 'text', text: JSON.stringify({ ok: true }) }],
          _meta: { http_status: 202 },
        },
      ]);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(
        server as unknown as Parameters<typeof registerGraphTools>[0],
        graphClient as unknown as Parameters<typeof registerGraphTools>[1]
      );

      await server.tools.get('send-mail')!.handler({
        body: JSON.stringify({
          message: { toRecipients: [{ emailAddress: { address: 'a@ext.com' } }] },
        }),
      });

      const payload = auditLogMock.mock.calls[0][0];
      expect(payload).toMatchObject({ recipient_count: 1, recipient_domains: ['ext.com'] });
    });

    it('leaves a base64 upload body alone instead of warning on every upload', async () => {
      mockEndpoints.push(
        makeEndpoint({
          method: 'put',
          path: '/me/photo/$value',
          alias: 'upload-my-profile-photo',
          requestFormat: 'binary',
          parameters: [{ name: 'body', type: 'Body', schema: z.string() }],
        })
      );
      mockEndpointsJson = [
        makeConfig({
          pathPattern: '/me/photo/$value',
          method: 'put',
          toolName: 'upload-my-profile-photo',
        }),
      ];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: '{}' }], _meta: { http_status: 200 } },
      ]);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(
        server as unknown as Parameters<typeof registerGraphTools>[0],
        graphClient as unknown as Parameters<typeof registerGraphTools>[1]
      );

      await server.tools.get('upload-my-profile-photo')!.handler({
        body: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
      });

      const payload = auditLogMock.mock.calls[0][0];
      expect(payload).not.toHaveProperty('recipient_count');
      // Base64 is never JSON. Parsing it warned on every upload, and the parse error
      // carries a slice of the file into the operational log
      expect(loggerMock.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('Skipped recipient audit metadata')
      );
    });

    it('records driveItem invite recipients, which use email rather than emailAddress', async () => {
      draftEndpoint();
      // share-drive-item mails an outsider a link to the file
      const payload = await runDraft({
        recipients: [{ email: 'outsider@ext.com' }],
        roles: ['read'],
        sendInvitation: true,
      });

      expect(payload).toMatchObject({ recipient_count: 1, recipient_domains: ['ext.com'] });
    });

    it('records meeting participants, which use upn', async () => {
      draftEndpoint();
      const payload = await runDraft({
        participants: { attendees: [{ upn: 'guest@ext.com' }] },
      });

      expect(payload).toMatchObject({ recipient_count: 1, recipient_domains: ['ext.com'] });
    });

    it('survives a deeply nested array without blowing the stack', async () => {
      draftEndpoint();
      // Must terminate, not overflow - this walker runs inside the catch handler. 500 is
      // far past MAX_BODY_DEPTH and still serialises on every Node we support; going
      // deeper only tests where JSON.stringify gives out, which moves between versions.
      let nested: unknown = [{ toRecipients: [{ emailAddress: { address: 'deep@ext.com' } }] }];
      for (let i = 0; i < 500; i++) nested = [nested];

      const payload = await runDraft({ requests: nested });

      // Too deep to reach, but it has to return rather than throw
      expect(payload).not.toHaveProperty('recipient_count');
      expect(payload.status).toBe('success');
    });

    it('still audits a call whose params cannot be serialised for the log', async () => {
      draftEndpoint();
      // The params log line runs before the try that writes the audit record, so an
      // unguarded stringify there escapes the tool entirely: protocol error, no trail.
      const circular: Record<string, unknown> = { subject: 'loop' };
      circular.self = circular;

      const payload = await runDraft(circular);

      expect(auditLogMock).toHaveBeenCalledTimes(1);
      expect(payload).toMatchObject({ tool: 'create-draft-email', status: 'error' });
    });

    it('still records recipients when the request throws', async () => {
      draftEndpoint();
      const graphClient = {
        graphRequest: vi.fn().mockRejectedValue(new Error('socket hang up')),
      };
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(
        server as unknown as Parameters<typeof registerGraphTools>[0],
        graphClient as unknown as Parameters<typeof registerGraphTools>[1]
      );

      await server.tools.get('create-draft-email')!.handler({
        body: { toRecipients: [{ emailAddress: { address: 'a@ext.com' } }] },
      });

      // A timeout is not proof of non-delivery, so the signal has to survive
      const payload = auditLogMock.mock.calls[0][0];
      expect(payload.status).toBe('error');
      expect(payload).toMatchObject({ recipient_count: 1, recipient_domains: ['ext.com'] });
    });

    it('walks recipients nested inside a graph-batch sub-request', async () => {
      draftEndpoint();
      // Routing a send through /$batch used to record nothing at all
      const payload = await runDraft({
        requests: [
          { id: '1', method: 'GET', url: '/me/messages?$top=5' },
          {
            id: '2',
            method: 'POST',
            url: '/me/sendMail',
            body: { message: { toRecipients: [{ emailAddress: { address: 'a@ext.com' } }] } },
          },
        ],
      });

      expect(payload).toMatchObject({ recipient_count: 1, recipient_domains: ['ext.com'] });
    });

    it('reaches an itemAttachment nested inside a graph-batch sub-request', async () => {
      draftEndpoint();
      // Deepest shape the docstring promises: 7 levels, one under MAX_BODY_DEPTH. Pinned
      // so trimming the budget fails here rather than quietly dropping the case.
      const payload = await runDraft({
        requests: [
          {
            id: '1',
            method: 'POST',
            url: '/me/sendMail',
            body: {
              message: {
                toRecipients: [{ emailAddress: { address: 'direct@ext.com' } }],
                attachments: [
                  {
                    '@odata.type': '#microsoft.graph.itemAttachment',
                    item: {
                      toRecipients: [{ emailAddress: { address: 'forwarded@deeper.example' } }],
                    },
                  },
                ],
              },
            },
          },
        ],
      });

      expect(payload.recipient_count).toBe(2);
      expect(payload.recipient_domains).toEqual(['deeper.example', 'ext.com']);
    });

    it('reads a bare string entry, malformed though it is', async () => {
      draftEndpoint();
      const payload = await runDraft({ toRecipients: ['a@ext.com'] });

      // Graph rejects this shape, so nothing is delivered - but an attempted send to an
      // outside domain is exactly what the trail is for
      expect(payload).toMatchObject({ recipient_count: 1, recipient_domains: ['ext.com'] });
    });

    it('reads an all-PascalCase recipient entry, as Graph accepts it', async () => {
      draftEndpoint();
      const payload = await runDraft({
        ToRecipients: [{ EmailAddress: { Address: 'a@ext.com' } }],
      });

      expect(payload).toMatchObject({ recipient_count: 1, recipient_domains: ['ext.com'] });
    });

    it('normalises a display-name address down to the bare domain', async () => {
      draftEndpoint();
      const payload = await runDraft({
        toRecipients: [
          { emailAddress: { address: 'Bob <bob@ext.com>' } },
          { emailAddress: { address: 'a@ext.com ' } },
          { emailAddress: { address: 'c@ext.com note' } },
        ],
      });

      // Same domain three ways - unnormalised that's three entries, one carrying junk
      expect(payload.recipient_domains).toEqual(['ext.com']);
      expect(payload.recipient_count).toBe(3);
    });

    it('caps the domain list but keeps recipient_count exact', async () => {
      draftEndpoint();
      const payload = await runDraft({
        toRecipients: Array.from({ length: 60 }, (_, i) => ({
          emailAddress: { address: `user@d${String(i).padStart(2, '0')}.example` },
        })),
      });

      // The count is the detection signal, so it has to survive the cap
      expect(payload.recipient_count).toBe(60);
      expect(payload.recipient_domains).toHaveLength(50);
      expect(payload.recipient_domains_truncated).toBe(true);
    });

    it('does not flag truncation when the domain list fits', async () => {
      draftEndpoint();
      const payload = await runDraft({
        toRecipients: [{ emailAddress: { address: 'a@example.com' } }],
      });

      expect(payload).not.toHaveProperty('recipient_domains_truncated');
    });

    it('omits both fields when a request has no recipients', async () => {
      draftEndpoint();
      const payload = await runDraft({ subject: 'a draft with no recipients yet' });

      expect(payload).not.toHaveProperty('recipient_count');
      expect(payload).not.toHaveProperty('recipient_domains');
    });
  });

  // ---- 1. $count advanced query mode ----
  describe('$count advanced query mode', () => {
    it('should set ConsistencyLevel: eventual header when $count=true', async () => {
      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ value: [] }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      // Invoke the registered tool with count=true
      const tool = server.tools.get('test-tool');
      expect(tool).toBeDefined();
      await tool!.handler({ count: true });

      // Verify graphRequest was called with ConsistencyLevel header
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
      const [url] = graphClient.graphRequest.mock.calls[0];
      // $count=true should appear in query string
      expect(url).toContain('$count=true');
    });
  });

  describe('audit target resources', () => {
    it('adds target_resource to generated Graph tool audit events', async () => {
      const endpoint = makeEndpoint({
        alias: 'get-drive-item',
        path: '/drives/:driveId/items/:driveItemId',
        parameters: [
          { name: 'driveId', type: 'Path', schema: z.string() },
          { name: 'driveItemId', type: 'Path', schema: z.string() },
        ],
      });
      const config = makeConfig({
        toolName: 'get-drive-item',
        pathPattern: '/drives/{drive-id}/items/{driveItem-id}',
        scopes: ['Files.Read'],
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ id: 'item-2' }) }] },
      ]);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      await server.tools.get('get-drive-item')!.handler({
        driveId: 'drive-1',
        driveItemId: 'item-2',
      });

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.call',
          tool: 'get-drive-item',
          status: 'success',
          target_resource: {
            type: 'drive_item',
            id: '/drives/drive-1/items/item-2',
          },
        })
      );
    });

    it('adds target_resource to failed generated Graph tool audit events', async () => {
      const endpoint = makeEndpoint({
        alias: 'get-drive-item',
        path: '/drives/:driveId/items/:driveItemId',
        parameters: [
          { name: 'driveId', type: 'Path', schema: z.string() },
          { name: 'driveItemId', type: 'Path', schema: z.string() },
        ],
      });
      const config = makeConfig({
        toolName: 'get-drive-item',
        pathPattern: '/drives/{drive-id}/items/{driveItem-id}',
        scopes: ['Files.Read'],
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient();
      graphClient.graphRequest.mockRejectedValueOnce(
        Object.assign(new Error('Forbidden'), { status: 403 })
      );
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(
        server as unknown as Parameters<typeof registerGraphTools>[0],
        graphClient as unknown as Parameters<typeof registerGraphTools>[1]
      );

      const result = await server.tools.get('get-drive-item')!.handler({
        driveId: 'drive-1',
        driveItemId: 'item-2',
      });

      expect(result.isError).toBe(true);
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.call',
          tool: 'get-drive-item',
          status: 'error',
          error_code: 403,
          target_resource: {
            type: 'drive_item',
            id: '/drives/drive-1/items/item-2',
          },
        })
      );
    });

    it('derives target_resource from generic ID path parameters', async () => {
      const endpoint = makeEndpoint({
        alias: 'get-mail-message',
        path: '/me/messages/:messageId',
        parameters: [{ name: 'messageId', type: 'Path', schema: z.string() }],
      });
      const config = makeConfig({
        toolName: 'get-mail-message',
        pathPattern: '/me/messages/{message-id}',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ id: 'message-1' }) }] },
      ]);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      await server.tools.get('get-mail-message')!.handler({
        messageId: 'message-1',
      });

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.call',
          tool: 'get-mail-message',
          status: 'success',
          target_resource: {
            type: 'message',
            id: '/me/messages/message-1',
          },
        })
      );
    });

    it('omits target_resource when an ID path parameter is missing', async () => {
      const endpoint = makeEndpoint({
        alias: 'get-drive-item',
        path: '/drives/:driveId/items/:driveItemId',
        parameters: [
          { name: 'driveId', type: 'Path', schema: z.string() },
          { name: 'driveItemId', type: 'Path', schema: z.string() },
        ],
      });
      const config = makeConfig({
        toolName: 'get-drive-item',
        pathPattern: '/drives/{drive-id}/items/{driveItem-id}',
        scopes: ['Files.Read'],
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ id: 'item-2' }) }] },
      ]);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      await server.tools.get('get-drive-item')!.handler({
        driveId: 'drive-1',
      });

      const [payload] = auditLogMock.mock.calls[0];
      expect(payload).toMatchObject({
        event: 'tool.call',
        tool: 'get-drive-item',
        status: 'success',
      });
      expect(payload).not.toHaveProperty('target_resource');
    });

    it('omits SharePoint path parameters from target_resource', async () => {
      const endpoint = makeEndpoint({
        alias: 'get-sharepoint-site-by-path',
        path: "/sites/:siteId/getByPath(path=':path')",
        parameters: [
          { name: 'siteId', type: 'Path', schema: z.string() },
          { name: 'path', type: 'Path', schema: z.string() },
        ],
      });
      const config = makeConfig({
        toolName: 'get-sharepoint-site-by-path',
        pathPattern: '/sites/{site-id}:/{path}',
        scopes: [['Sites.Read.All'], ['Sites.Selected']],
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ id: 'site-1' }) }] },
      ]);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      await server.tools.get('get-sharepoint-site-by-path')!.handler({
        siteId: 'contoso.sharepoint.com',
        path: '/sites/Finance',
      });

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.call',
          tool: 'get-sharepoint-site-by-path',
          status: 'success',
          target_resource: {
            type: 'site',
            id: '/sites/contoso.sharepoint.com',
          },
        })
      );
      const [payload] = auditLogMock.mock.calls[0];
      expect(JSON.stringify(payload)).not.toContain('Finance');
    });

    it('omits target_resource for generated broad list/search audit events', async () => {
      const endpoint = makeEndpoint({
        alias: 'list-mail-messages',
        path: '/me/messages',
      });
      const config = makeConfig({
        toolName: 'list-mail-messages',
        pathPattern: '/me/messages',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ value: [] }) }] },
      ]);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      await server.tools.get('list-mail-messages')!.handler({ search: 'budget' });

      const [payload] = auditLogMock.mock.calls[0];
      expect(payload).toMatchObject({
        event: 'tool.call',
        tool: 'list-mail-messages',
        status: 'success',
      });
      expect(payload).not.toHaveProperty('target_resource');
    });
  });

  // ---- 2. fetchAllPages pagination ----
  describe('fetchAllPages pagination', () => {
    it('should follow @odata.nextLink and combine results', async () => {
      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                value: [{ id: '1' }, { id: '2' }],
                '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=2',
              }),
            },
          ],
        },
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                value: [{ id: '3' }],
              }),
            },
          ],
        },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('test-tool');
      const result = await tool!.handler({ fetchAllPages: true });

      // Should have made 2 requests (initial + 1 nextLink)
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(2);

      // Combined result should have 3 items
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.value).toHaveLength(3);
      expect(parsed.value.map((v: any) => v.id)).toEqual(['1', '2', '3']);
      // nextLink should be removed from final response
      expect(parsed['@odata.nextLink']).toBeUndefined();
    });

    it('returns and audits a later-page Graph error instead of partial success', async () => {
      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                value: [{ id: '1' }],
                '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=1',
              }),
            },
          ],
          _meta: { http_status: 200 },
        },
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Microsoft Graph API error: 429 Too Many Requests' }),
            },
          ],
          isError: true,
          _meta: { http_status: 429, error_code: 'tooManyRequests' },
        },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const result = await server.tools.get('test-tool')!.handler({ fetchAllPages: true });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toContain('429 Too Many Requests');
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(2);
      expect(loggerMock.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Error during pagination')
      );
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.call',
          tool: 'test-tool',
          status: 'error',
          http_status: 429,
          error_code: 'tooManyRequests',
        })
      );
    });

    it('merges all pages under --toon and encodes the combined result once (#560)', async () => {
      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      // Pages are JSON here to mimic the forceJsonOutput path; the mock's serialize
      // adds the TOON prefix so we can check the merged result was re-encoded (#560).
      const graphClient = createMockGraphClient(
        [
          {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  value: [{ id: '1' }, { id: '2' }],
                  '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=2',
                }),
              },
            ],
          },
          {
            content: [{ type: 'text', text: JSON.stringify({ value: [{ id: '3' }] }) }],
          },
        ],
        'toon'
      );

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('test-tool');
      const result = await tool!.handler({ fetchAllPages: true });

      // Both page requests must be forced to JSON so the merge can parse them.
      for (const call of graphClient.graphRequest.mock.calls) {
        expect(call[1]?.forceJsonOutput).toBe(true);
      }

      // Final body is encoded once via serialize() in the configured (toon) format,
      // not re-parsed as JSON. It must still contain all 3 merged items.
      expect(graphClient.serialize).toHaveBeenCalledTimes(1);
      expect(result.content[0].text.startsWith('TOON:')).toBe(true);
      const parsed = JSON.parse(result.content[0].text.slice('TOON:'.length));
      expect(parsed.value.map((v: any) => v.id)).toEqual(['1', '2', '3']);
      expect(parsed['@odata.nextLink']).toBeUndefined();
    });

    it('does not inject value:[] when fetchAllPages hits a single-object (non-collection) GET', async () => {
      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      // Single-object response (no `value`). fetchAllPages can be set on any GET,
      // and the merge must leave the object alone, not graft on an empty value array.
      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ id: 'abc', displayName: 'Solo' }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const result = await server.tools.get('test-tool')!.handler({ fetchAllPages: true });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({ id: 'abc', displayName: 'Solo' });
      expect(parsed.value).toBeUndefined();
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    });

    it('should stop at 100 page limit', async () => {
      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      // Generate 101 responses — each has a nextLink except the last
      const responses = [];
      for (let i = 0; i < 101; i++) {
        responses.push({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                value: [{ id: `item-${i}` }],
                '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=' + (i + 1),
              }),
            },
          ],
        });
      }

      const graphClient = createMockGraphClient(responses);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('test-tool');
      await tool!.handler({ fetchAllPages: true });

      // 1 initial + 99 pagination = 100 total requests (stops at pageCount=100)
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(100);
    });

    describe('pagination env caps', () => {
      const prev = {
        pages: process.env.MS365_MCP_MAX_PAGES,
        items: process.env.MS365_MCP_MAX_ITEMS,
        allow: process.env.MS365_MCP_ALLOW_PAGINATION,
      };

      afterEach(() => {
        const restore = (name: string, value: string | undefined) =>
          value === undefined ? delete process.env[name] : (process.env[name] = value);
        restore('MS365_MCP_MAX_PAGES', prev.pages);
        restore('MS365_MCP_MAX_ITEMS', prev.items);
        restore('MS365_MCP_ALLOW_PAGINATION', prev.allow);
      });

      const paginatingResponses = (count: number) =>
        Array.from({ length: count }, (_, i) => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                value: [{ id: `item-${i}` }],
                '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=' + (i + 1),
              }),
            },
          ],
        }));

      it('should honor MS365_MCP_MAX_PAGES below the default', async () => {
        process.env.MS365_MCP_MAX_PAGES = '2';
        mockEndpoints.push(makeEndpoint());
        mockEndpointsJson = [makeConfig()];

        const graphClient = createMockGraphClient(paginatingResponses(5));
        const server = createMockServer();
        const { registerGraphTools } = await loadModule();
        registerGraphTools(server as any, graphClient as any);

        await server.tools.get('test-tool')!.handler({ fetchAllPages: true });

        // 1 initial + 1 pagination = 2 total requests (stops at pageCount=2)
        expect(graphClient.graphRequest).toHaveBeenCalledTimes(2);
      });

      it('should honor MS365_MCP_MAX_ITEMS below the default', async () => {
        process.env.MS365_MCP_MAX_ITEMS = '2';
        mockEndpoints.push(makeEndpoint());
        mockEndpointsJson = [makeConfig()];

        // First page already carries 2 items → the while-loop guard stops it.
        const graphClient = createMockGraphClient([
          {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  value: [{ id: '1' }, { id: '2' }],
                  '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=2',
                }),
              },
            ],
          },
          ...paginatingResponses(3),
        ]);
        const server = createMockServer();
        const { registerGraphTools } = await loadModule();
        registerGraphTools(server as any, graphClient as any);

        const result = await server.tools.get('test-tool')!.handler({ fetchAllPages: true });

        expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
        expect(JSON.parse(result.content[0].text).value).toHaveLength(2);
      });

      it('should not follow nextLink when MS365_MCP_ALLOW_PAGINATION is disabled', async () => {
        process.env.MS365_MCP_ALLOW_PAGINATION = '0';
        mockEndpoints.push(makeEndpoint());
        mockEndpointsJson = [makeConfig()];

        const graphClient = createMockGraphClient(paginatingResponses(5));
        const server = createMockServer();
        const { registerGraphTools } = await loadModule();
        registerGraphTools(server as any, graphClient as any);

        await server.tools.get('test-tool')!.handler({ fetchAllPages: true });

        // Disabled → first page only, no nextLink following
        expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
        // Disabled → the parameter is not advertised to the model at all
        expect(server.tools.get('test-tool')!.schema.fetchAllPages).toBeUndefined();
      });

      it('should advertise fetchAllPages when pagination is enabled', async () => {
        delete process.env.MS365_MCP_ALLOW_PAGINATION;
        mockEndpoints.push(makeEndpoint());
        mockEndpointsJson = [makeConfig()];

        const server = createMockServer();
        const { registerGraphTools } = await loadModule();
        registerGraphTools(server as any, createMockGraphClient() as any);

        expect(server.tools.get('test-tool')!.schema.fetchAllPages).toBeDefined();
      });

      it('should reflect MS365_MCP_MAX_PAGES in the fetchAllPages description', async () => {
        process.env.MS365_MCP_MAX_PAGES = '7';
        mockEndpoints.push(makeEndpoint());
        mockEndpointsJson = [makeConfig()];

        const server = createMockServer();
        const { registerGraphTools } = await loadModule();
        registerGraphTools(server as any, createMockGraphClient() as any);

        const schema = server.tools.get('test-tool')!.schema.fetchAllPages;
        expect(schema.description).toContain('up to 7 pages');
      });
    });
  });

  // ---- 3. Parameter describe() overrides ----
  describe('parameter describe() overrides', () => {
    it('should apply custom descriptions to OData parameters', async () => {
      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, createMockGraphClient() as any);

      const tool = server.tools.get('test-tool');
      expect(tool).toBeDefined();

      const schema = tool!.schema;

      // $filter override
      expect(schema['filter']).toBeDefined();
      expect(schema['filter'].description).toContain('OData filter expression');
      expect(schema['filter'].description).toContain('$count=true');

      // $search override
      expect(schema['search']).toBeDefined();
      expect(schema['search'].description).toContain('KQL search query');

      // $select override
      expect(schema['select']).toBeDefined();
      expect(schema['select'].description).toContain('Comma-separated fields');

      // $orderby override
      expect(schema['orderby']).toBeDefined();
      expect(schema['orderby'].description).toContain('Sort expression');

      // $count override
      expect(schema['count']).toBeDefined();
      expect(schema['count'].description).toContain('advanced query mode');

      expect(schema['top'].description).toContain('Start small');
      expect(schema['top'].description).toContain('$select');
    });
    it('should describe $expand as navigation-properties-only', async () => {
      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, createMockGraphClient() as any);

      const schema = server.tools.get('test-tool')!.schema;

      expect(schema['expand']).toBeDefined();
      // Must not be Microsoft's uninformative "Expand related entities".
      expect(schema['expand'].description).not.toBe('Expand related entities');
      expect(schema['expand'].description).toContain('navigation');
      // Names at least one real navigation property so the model has something to copy.
      expect(schema['expand'].description).toContain('attachments');
    });

    // graph-tools synthesizes path params only for endpoints where the generated
    // client (via hack.ts) has not already supplied one — mostly function-style paths.
    it('should describe path params it synthesizes itself', async () => {
      const endpoint = makeEndpoint({ path: '/me/messages/:messageId' });
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, createMockGraphClient() as any);

      const schema = server.tools.get('test-tool')!.schema;

      expect(schema['messageId']).toBeDefined();
      expect(schema['messageId'].description).not.toBe('Path parameter: messageId');
      expect(schema['messageId'].description).toContain("not as 'id'");
    });
  });

  describe('MS365_MCP_MAX_TOP', () => {
    const prevMaxTop = process.env.MS365_MCP_MAX_TOP;

    afterEach(() => {
      if (prevMaxTop === undefined) delete process.env.MS365_MCP_MAX_TOP;
      else process.env.MS365_MCP_MAX_TOP = prevMaxTop;
    });

    it('should clamp $top when MS365_MCP_MAX_TOP is set', async () => {
      process.env.MS365_MCP_MAX_TOP = '10';

      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ value: [] }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('test-tool');
      await tool!.handler({ top: 50 });

      const [url] = graphClient.graphRequest.mock.calls[0];
      expect(url).toContain('$top=10');
    });

    it('should pass through $top when MS365_MCP_MAX_TOP is unset', async () => {
      delete process.env.MS365_MCP_MAX_TOP;

      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ value: [] }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('test-tool');
      await tool!.handler({ top: 50 });

      const [url] = graphClient.graphRequest.mock.calls[0];
      expect(url).toContain('$top=50');
    });
  });

  // ---- 4. returnDownloadUrl ----
  describe('returnDownloadUrl', () => {
    it('should strip /content from path and return downloadUrl when returnDownloadUrl=true', async () => {
      const endpoint = makeEndpoint({
        alias: 'download-file',
        path: '/me/drive/items/:driveItem-id/content',
        parameters: [{ name: 'driveItem-id', type: 'Path', schema: z.string() }],
      });
      const config = makeConfig({
        toolName: 'download-file',
        pathPattern: '/me/drive/items/{driveItem-id}/content',
        returnDownloadUrl: true,
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const downloadUrl = 'https://download.example.com/file.pdf';
      const graphClient = createMockGraphClient([
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                '@microsoft.graph.downloadUrl': downloadUrl,
                name: 'file.pdf',
              }),
            },
          ],
        },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('download-file');
      expect(tool).toBeDefined();
      await tool!.handler({ 'driveItem-id': 'abc123' });

      // Path should NOT end with /content — it gets stripped
      const [requestedPath] = graphClient.graphRequest.mock.calls[0];
      expect(requestedPath).not.toContain('/content');
      expect(requestedPath).toContain('/me/drive/items/abc123');
    });
  });

  // ---- 5. kebab-case path param normalization ----
  describe('kebab-case path param normalization', () => {
    it('should substitute path when LLM passes message-id (kebab) but schema has messageId (camelCase)', async () => {
      // Simulates what hack.ts generates: path uses :messageId (camelCase)
      // but LLMs may pass message-id (kebab-case) since endpoints.json uses {message-id}
      const endpoint = makeEndpoint({
        alias: 'get-mail-message',
        method: 'get',
        path: '/me/messages/:messageId',
        parameters: [
          { name: 'messageId', type: 'Path', schema: z.string() },
          { name: 'select', type: 'Query', schema: z.string().optional() },
        ],
      });
      const config = makeConfig({
        toolName: 'get-mail-message',
        pathPattern: '/me/messages/{message-id}',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ id: 'AAMk123', subject: 'Test' }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-mail-message');
      expect(tool).toBeDefined();

      // Pass kebab-case 'message-id' — should still resolve to correct path
      await tool!.handler({ 'message-id': 'AAMk123abc=' });

      const [requestedPath] = graphClient.graphRequest.mock.calls[0];
      expect(requestedPath).toContain('AAMk123abc=');
      expect(requestedPath).not.toContain(':messageId');
    });

    it('should also work when LLM passes messageId (camelCase) directly', async () => {
      const endpoint = makeEndpoint({
        alias: 'get-mail-message2',
        method: 'get',
        path: '/me/messages/:messageId',
        parameters: [{ name: 'messageId', type: 'Path', schema: z.string() }],
      });
      const config = makeConfig({
        toolName: 'get-mail-message2',
        pathPattern: '/me/messages/{message-id}',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ id: 'AAMk456' }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-mail-message2');
      await tool!.handler({ messageId: 'AAMk456xyz=' });

      const [requestedPath] = graphClient.graphRequest.mock.calls[0];
      expect(requestedPath).toContain('AAMk456xyz=');
      expect(requestedPath).not.toContain(':messageId');
    });
  });

  // ---- 6. supportsTimezone ----
  describe('supportsTimezone', () => {
    it('should set Prefer: outlook.timezone header when timezone param provided', async () => {
      const endpoint = makeEndpoint({
        alias: 'list-calendar-events',
        path: '/me/events',
        parameters: [],
      });
      const config = makeConfig({
        toolName: 'list-calendar-events',
        pathPattern: '/me/events',
        supportsTimezone: true,
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ value: [] }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('list-calendar-events');
      expect(tool).toBeDefined();

      // Verify timezone parameter was added to schema
      expect(tool!.schema['timezone']).toBeDefined();
      expect(tool!.schema['timezone'].description).toContain('IANA timezone');

      await tool!.handler({ timezone: 'Europe/Brussels' });

      // Verify Prefer header contains outlook.timezone
      const [, options] = graphClient.graphRequest.mock.calls[0];
      expect(options.headers['Prefer']).toContain('outlook.timezone="Europe/Brussels"');
    });

    it('should NOT add timezone parameter when supportsTimezone is false/absent', async () => {
      const endpoint = makeEndpoint({
        alias: 'list-mail',
        path: '/me/messages',
        parameters: [],
      });
      const config = makeConfig({
        toolName: 'list-mail',
        pathPattern: '/me/messages',
        // no supportsTimezone
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, createMockGraphClient() as any);

      const tool = server.tools.get('list-mail');
      expect(tool!.schema['timezone']).toBeUndefined();
    });
  });

  // ---- 7. outlook.body-content-type Prefer header ----
  describe('outlook.body-content-type Prefer header', () => {
    it('should set Prefer: outlook.body-content-type="text" on GET requests', async () => {
      const endpoint = makeEndpoint({ method: 'get' });
      const config = makeConfig({ method: 'get' });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ value: [] }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      await server.tools.get('test-tool')!.handler({});

      const [, options] = graphClient.graphRequest.mock.calls[0];
      expect(options.headers['Prefer']).toContain('outlook.body-content-type="text"');
    });

    it('should NOT set Prefer: outlook.body-content-type on POST requests', async () => {
      const endpoint = makeEndpoint({
        alias: 'create-reply-draft',
        method: 'post',
        path: '/me/messages/:messageId/createReply',
        parameters: [
          { name: 'messageId', type: 'Path', schema: z.string() },
          { name: 'body', type: 'Body', schema: z.any() },
        ],
      });
      const config = makeConfig({
        toolName: 'create-reply-draft',
        method: 'post',
        pathPattern: '/me/messages/{message-id}/createReply',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([{ content: [{ type: 'text', text: '{}' }] }]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      await server.tools.get('create-reply-draft')!.handler({
        messageId: 'AAMk123',
        body: { Message: { body: { contentType: 'html', content: '<p>hi</p>' } } },
        confirm: true, // destructive POST — required by isDestructiveOperation gate
      });

      const [, options] = graphClient.graphRequest.mock.calls[0];
      const prefer = options.headers['Prefer'];
      expect(prefer === undefined || !prefer.includes('outlook.body-content-type')).toBe(true);
    });
  });

  // ---- 8. Binary upload (requestFormat: 'binary') ----
  describe('binary upload bodies', () => {
    it('decodes base64 body to bytes and sets octet-stream Content-Type', async () => {
      const endpoint = makeEndpoint({
        alias: 'upload-file-content',
        method: 'put',
        path: '/drives/:driveId/items/:driveItemId/content',
        requestFormat: 'binary' as const,
        parameters: [
          { name: 'driveId', type: 'Path', schema: z.string() },
          { name: 'driveItemId', type: 'Path', schema: z.string() },
          {
            name: 'body',
            type: 'Body',
            schema: z.string().describe('Base64-encoded file content'),
          },
        ],
      });
      const config = makeConfig({
        toolName: 'upload-file-content',
        method: 'put',
        pathPattern: '/drives/{drive-id}/items/{driveItem-id}/content',
        scopes: ['Files.ReadWrite'],
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([{ content: [{ type: 'text', text: '{}' }] }]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const original = 'Hello, world!';
      const base64 = Buffer.from(original, 'utf-8').toString('base64');

      await server.tools.get('upload-file-content')!.handler({
        driveId: 'drive123',
        driveItemId: 'item456',
        body: base64,
        confirm: true, // destructive PUT — required by isDestructiveOperation gate
      });

      const [path, options] = graphClient.graphRequest.mock.calls[0];
      expect(path).toBe('/drives/drive123/items/item456/content');
      expect(options.headers['Content-Type']).toBe('application/octet-stream');
      expect(Buffer.isBuffer(options.body) || options.body instanceof Uint8Array).toBe(true);
      expect(Buffer.from(options.body).toString('utf-8')).toBe(original);
    });

    it('honors endpoints.json contentType override on binary uploads', async () => {
      const endpoint = makeEndpoint({
        alias: 'upload-file-content',
        method: 'put',
        path: '/drives/:driveId/items/:driveItemId/content',
        requestFormat: 'binary' as const,
        parameters: [
          { name: 'driveId', type: 'Path', schema: z.string() },
          { name: 'driveItemId', type: 'Path', schema: z.string() },
          { name: 'body', type: 'Body', schema: z.string() },
        ],
      });
      const config = makeConfig({
        toolName: 'upload-file-content',
        method: 'put',
        pathPattern: '/drives/{drive-id}/items/{driveItem-id}/content',
        scopes: ['Files.ReadWrite'],
        contentType: 'application/pdf',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([{ content: [{ type: 'text', text: '{}' }] }]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      await server.tools.get('upload-file-content')!.handler({
        driveId: 'd',
        driveItemId: 'i',
        body: Buffer.from('%PDF-1.4').toString('base64'),
        confirm: true, // destructive PUT — required by isDestructiveOperation gate
      });

      const [, options] = graphClient.graphRequest.mock.calls[0];
      expect(options.headers['Content-Type']).toBe('application/pdf');
    });
  });

  // ---- 9. download-bytes utility tool ----
  describe('download-bytes', () => {
    it('routes a relative Graph path through graphRequest', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                contentType: 'image/jpeg',
                encoding: 'base64',
                contentBytes: 'aGk=',
              }),
            },
          ],
        }),
      };

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('download-bytes');
      expect(tool).toBeDefined();

      await tool!.handler({ target: '/me/photo/$value' });

      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
      const [path, options] = graphClient.graphRequest.mock.calls[0];
      expect(path).toBe('/me/photo/$value');
      expect(options.accessToken).toBeUndefined();
    });

    it('rejects absolute URLs (Graph paths only)', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, {} as any);

      const tool = server.tools.get('download-bytes');
      const result = await tool!.handler({
        target: 'https://example.sharepoint.com/d/abc?temp=signed',
      });

      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/relative Microsoft Graph path/);
    });

    it('rejects targets that do not start with /', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, {} as any);

      const tool = server.tools.get('download-bytes');
      const result = await tool!.handler({ target: 'ftp://example.com/x' });

      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/relative Microsoft Graph path/);
    });
  });

  // ---- 9a. download-bytes-to-file utility tool ----
  describe('download-bytes-to-file', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'dbtf-'));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('streams bytes to the output path and returns metadata', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      // downloadToFile is mocked here; binary-response.test.ts covers the real
      // streaming + write. This just checks the tool wires the call and maps it.
      const graphClient = {
        downloadToFile: vi.fn().mockResolvedValue({
          contentType: 'image/jpeg',
          contentLength: 2,
          httpStatus: 200,
        }),
      };

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('download-bytes-to-file');
      expect(tool).toBeDefined();

      const outputPath = join(tmpDir, 'photo.jpg');
      const result = await tool!.handler({ target: '/me/photo/$value', outputPath });

      expect(graphClient.downloadToFile).toHaveBeenCalledTimes(1);
      const [reqPath, dest, options] = graphClient.downloadToFile.mock.calls[0];
      expect(reqPath).toBe('/me/photo/$value');
      expect(dest).toBe(outputPath);
      expect(options).toStrictEqual({ accessToken: undefined });

      expect(result.isError).toBeUndefined();
      const payload = JSON.parse(result.content[0].text);
      expect(payload).toEqual({ path: outputPath, contentType: 'image/jpeg', bytesWritten: 2 });
      expect(result._meta).toMatchObject({ http_status: 200 });
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.call',
          tool: 'download-bytes-to-file',
          status: 'success',
          http_status: 200,
        })
      );
    });

    it('rejects a relative outputPath', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = { downloadToFile: vi.fn() };
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const result = await server.tools
        .get('download-bytes-to-file')!
        .handler({ target: '/me/photo/$value', outputPath: 'relative/path.jpg' });

      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/absolute path/);
      expect(graphClient.downloadToFile).not.toHaveBeenCalled();
    });

    it('rejects absolute URLs in target (Graph paths only)', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, {} as any);

      const result = await server.tools.get('download-bytes-to-file')!.handler({
        target: 'https://example.sharepoint.com/d/abc?temp=signed',
        outputPath: join(tmpDir, 'x.bin'),
      });

      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/relative Microsoft Graph path/);
    });

    it('refuses to overwrite an existing file and skips the Graph call', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const outputPath = join(tmpDir, 'existing.bin');
      writeFileSync(outputPath, 'original');

      const graphClient = { downloadToFile: vi.fn() };
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const result = await server.tools
        .get('download-bytes-to-file')!
        .handler({ target: '/me/photo/$value', outputPath });

      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/already exists/);
      expect(graphClient.downloadToFile).not.toHaveBeenCalled();
      // Original file is untouched.
      expect(readFileSync(outputPath).toString('utf8')).toBe('original');
    });

    it('surfaces a Graph error when downloadToFile throws', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      // downloadToFile throws on Graph HTTP errors and cleans up any partial file
      // itself; here we just check the tool surfaces the error.
      const graphClient = {
        downloadToFile: vi
          .fn()
          .mockRejectedValue(new Error('Microsoft Graph API error: 404 Not Found')),
      };
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const outputPath = join(tmpDir, 'missing.bin');
      const result = await server.tools
        .get('download-bytes-to-file')!
        .handler({ target: '/me/messages/abc/attachments/xyz/$value', outputPath });

      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/404 Not Found/);
    });

    it('forwards the resolved account token to downloadToFile in multi-account mode', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = {
        downloadToFile: vi
          .fn()
          .mockResolvedValue({ contentType: 'application/pdf', contentLength: 3 }),
      };
      const authManager = {
        isOAuthModeEnabled: vi.fn().mockReturnValue(false),
        getToken: vi.fn().mockResolvedValue(null),
        getTokenForAccount: vi.fn().mockResolvedValue('account-2-token'),
      };
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(
        server as any,
        graphClient as any,
        false,
        undefined,
        false,
        authManager as any,
        true,
        ['user1@domain.com', 'user2@domain.com']
      );

      const outputPath = join(tmpDir, 'invoice.pdf');
      const result = await server.tools.get('download-bytes-to-file')!.handler({
        target: '/me/messages/m1/attachments/a1/$value',
        outputPath,
        account: 'user2@domain.com',
      });

      expect(result.isError).toBeUndefined();
      expect(authManager.getTokenForAccount).toHaveBeenCalledWith('user2@domain.com');
      expect(graphClient.downloadToFile).toHaveBeenCalledWith(
        '/me/messages/m1/attachments/a1/$value',
        outputPath,
        { accessToken: 'account-2-token' }
      );
    });

    it('is registered in stdio mode but hidden in HTTP mode', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const { registerGraphTools } = await loadModule();

      const stdioServer = createMockServer();
      registerGraphTools(stdioServer as any, {} as any);
      expect(stdioServer.tools.has('download-bytes-to-file')).toBe(true);
      // download-bytes remains available in both modes.
      expect(stdioServer.tools.has('download-bytes')).toBe(true);

      const httpServer = createMockServer();
      // httpMode is the 10th positional arg.
      registerGraphTools(
        httpServer as any,
        {} as any,
        false,
        undefined,
        false,
        undefined,
        false,
        [],
        undefined,
        true
      );
      expect(httpServer.tools.has('download-bytes-to-file')).toBe(false);
      expect(httpServer.tools.has('download-bytes')).toBe(true);
    });
  });

  // ---- 9b. get-download-url utility tool ----
  describe('get-download-url', () => {
    it('strips /content, fetches item metadata, and returns the pre-authed downloadUrl', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const downloadUrl = 'https://contoso.sharepoint.com/download.aspx?tempauth=abc';
      const graphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: 'item1',
                name: 'report.pdf',
                size: 12727,
                file: { mimeType: 'application/pdf' },
                '@microsoft.graph.downloadUrl': downloadUrl,
              }),
            },
          ],
          _meta: { http_status: 200 },
        }),
      };

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-download-url');
      expect(tool).toBeDefined();

      const result = await tool!.handler({
        target: '/drives/d1/items/item1/content',
      });

      // /content is stripped before fetching the item metadata.
      const [requestedPath] = graphClient.graphRequest.mock.calls[0];
      expect(requestedPath).toBe('/drives/d1/items/item1');

      const payload = JSON.parse(result.content[0].text);
      expect(payload.downloadUrl).toBe(downloadUrl);
      expect(payload.name).toBe('report.pdf');
      expect(payload.size).toBe(12727);
      expect(payload.contentType).toBe('application/pdf');
      expect(result._meta).toMatchObject({ http_status: 200 });
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.call',
          tool: 'get-download-url',
          status: 'success',
          http_status: 200,
        })
      );
    });

    it('forces a JSON body on the metadata request so it works under --toon (#560)', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({ '@microsoft.graph.downloadUrl': 'https://dl.example/x' }),
            },
          ],
        }),
      };

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const result = await server.tools
        .get('get-download-url')!
        .handler({ target: '/drives/d1/items/item1/content' });

      // Without forceJsonOutput the client would TOON-encode the metadata and the
      // handler's JSON.parse would fail, masking a valid item as "no download url".
      const [, opts] = graphClient.graphRequest.mock.calls[0];
      expect(opts?.forceJsonOutput).toBe(true);
      expect(JSON.parse(result.content[0].text).downloadUrl).toBe('https://dl.example/x');
    });

    it('rejects query-shaped targets instead of silently changing request semantics', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = { graphRequest: vi.fn() };
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-download-url');
      const result = await tool!.handler({
        target: '/drives/d1/items/item1/content?$select=id,name',
      });

      expect(result.isError).toBe(true);
      expect(graphClient.graphRequest).not.toHaveBeenCalled();
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toContain('must not include query parameters');
    });

    it('rejects non-drive Graph targets before making an authenticated request', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = { graphRequest: vi.fn() };
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-download-url');
      const result = await tool!.handler({
        target: '/me/messages/m1',
      });

      expect(result.isError).toBe(true);
      expect(graphClient.graphRequest).not.toHaveBeenCalled();
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toContain('target must identify a driveItem');
    });

    it('rejects mail attachment $value paths (no pre-authed URL exists)', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = { graphRequest: vi.fn() };
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-download-url');
      const result = await tool!.handler({
        target: '/me/messages/m1/attachments/a1/$value',
      });

      expect(result.isError).toBe(true);
      expect(graphClient.graphRequest).not.toHaveBeenCalled();
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/do not expose a pre-authenticated download URL/);
    });

    it('rejects calendar event attachment $value paths (no pre-authed URL exists)', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = { graphRequest: vi.fn() };
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-download-url');
      const result = await tool!.handler({
        target: '/me/events/e1/attachments/a1/$value',
      });

      expect(result.isError).toBe(true);
      expect(graphClient.graphRequest).not.toHaveBeenCalled();
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/Mail and calendar event attachments/);
    });

    it('rejects group mailbox attachment paths (no pre-authed URL exists)', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = { graphRequest: vi.fn() };
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-download-url');
      const result = await tool!.handler({
        target: '/groups/g1/messages/m1/attachments/a1/$value',
      });

      expect(result.isError).toBe(true);
      expect(graphClient.graphRequest).not.toHaveBeenCalled();
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/Mail and calendar event attachments/);
    });

    it('rejects list-item driveItem relationships until callers provide a drive item path', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = { graphRequest: vi.fn() };
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-download-url');
      const result = await tool!.handler({
        target: '/sites/site1/lists/list1/items/item1/driveItem',
      });

      expect(result.isError).toBe(true);
      expect(graphClient.graphRequest).not.toHaveBeenCalled();
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toContain('target must identify a driveItem');
    });

    it('errors when the resource exposes no downloadUrl', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify({ id: 'item1', name: 'x' }) }],
        }),
      };

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-download-url');
      const result = await tool!.handler({ target: '/drives/d1/items/item1' });

      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/No pre-authenticated download URL/);
    });

    it('surfaces the underlying Graph error instead of masking it as no-downloadUrl', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      // graphRequest catches Graph HTTP errors internally and returns { isError: true }.
      const graphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Microsoft Graph API error: 403 Forbidden' }),
            },
          ],
        }),
      };

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-download-url');
      const result = await tool!.handler({ target: '/drives/d1/items/item1/content' });

      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/403 Forbidden/);
      expect(payload.error).not.toMatch(/No pre-authenticated download URL/);
    });

    it('does not falsely reject drive folders literally named "attachments"', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const downloadUrl = 'https://contoso.sharepoint.com/download.aspx?tempauth=xyz';
      const graphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                name: 'report.pdf',
                '@microsoft.graph.downloadUrl': downloadUrl,
              }),
            },
          ],
        }),
      };

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-download-url');
      const result = await tool!.handler({
        target: '/me/drive/root:/Project/attachments/report.pdf:/content',
      });

      expect(result.isError).toBeFalsy();
      const payload = JSON.parse(result.content[0].text);
      expect(payload.downloadUrl).toBe(downloadUrl);
    });

    it('does not falsely reject drive item paths containing messages and attachments folders', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const downloadUrl = 'https://contoso.sharepoint.com/download.aspx?tempauth=folders';
      const graphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                name: 'report.pdf',
                '@microsoft.graph.downloadUrl': downloadUrl,
              }),
            },
          ],
        }),
      };

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-download-url');
      const result = await tool!.handler({
        target: '/me/drive/root:/messages/m1/attachments/a1/report.pdf:/content',
      });

      expect(result.isError).toBeFalsy();
      const [requestedPath] = graphClient.graphRequest.mock.calls[0];
      expect(requestedPath).toBe('/me/drive/root:/messages/m1/attachments/a1/report.pdf:');
      const payload = JSON.parse(result.content[0].text);
      expect(payload.downloadUrl).toBe(downloadUrl);
    });

    it('allows SharePoint site drive item paths', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const downloadUrl = 'https://contoso.sharepoint.com/download.aspx?tempauth=site-drive';
      const graphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                name: 'site-report.pdf',
                '@microsoft.graph.downloadUrl': downloadUrl,
              }),
            },
          ],
        }),
      };

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-download-url');
      const result = await tool!.handler({
        target: '/sites/site1/drive/items/item1/content',
      });

      expect(result.isError).toBeFalsy();
      const [requestedPath] = graphClient.graphRequest.mock.calls[0];
      expect(requestedPath).toBe('/sites/site1/drive/items/item1');
      const payload = JSON.parse(result.content[0].text);
      expect(payload.downloadUrl).toBe(downloadUrl);
    });

    it('does not strip a drive item path whose item name is content', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const downloadUrl = 'https://contoso.sharepoint.com/download.aspx?tempauth=content-file';
      const graphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                name: 'content',
                '@microsoft.graph.downloadUrl': downloadUrl,
              }),
            },
          ],
        }),
      };

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-download-url');
      const result = await tool!.handler({
        target: '/me/drive/root:/Project/content:',
      });

      expect(result.isError).toBeFalsy();
      const [requestedPath] = graphClient.graphRequest.mock.calls[0];
      expect(requestedPath).toBe('/me/drive/root:/Project/content:');
      const payload = JSON.parse(result.content[0].text);
      expect(payload.downloadUrl).toBe(downloadUrl);
    });

    it('rejects meeting recording content paths because Graph returns authenticated bytes', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = { graphRequest: vi.fn() };
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-download-url');
      const result = await tool!.handler({
        target: '/me/onlineMeetings/meeting1/recordings/recording1/content',
      });

      expect(result.isError).toBe(true);
      expect(graphClient.graphRequest).not.toHaveBeenCalled();
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/Meeting recordings do not expose/);
    });

    it('refuses mismatched account param in bearer mode before resolving download URL', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = { graphRequest: vi.fn() };
      const authManager = {
        isOAuthModeEnabled: vi.fn().mockReturnValue(false),
        getToken: vi.fn().mockResolvedValue(null),
        getTokenForAccount: vi.fn(),
      };
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(
        server as any,
        graphClient as any,
        false,
        undefined,
        false,
        authManager as any,
        true,
        ['user1@domain.com', 'user2@domain.com']
      );
      const { requestContext } = await import('../request-context.js');

      const tool = server.tools.get('get-download-url');
      const bearer = makeJwt({ upn: 'user1@domain.com' });
      const result = await requestContext.run({ accessToken: bearer }, () =>
        tool!.handler({
          target: '/drives/d1/items/item1/content',
          account: 'user2@domain.com',
        })
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("'account' parameter is not supported");
      expect(graphClient.graphRequest).not.toHaveBeenCalled();
      expect(authManager.getTokenForAccount).not.toHaveBeenCalled();
    });
  });

  // ---- 10. Utility tools surface in --discovery mode ----
  describe('allowed scopes filtering', () => {
    it('registerGraphTools hides Graph tools outside the allowed scopes', async () => {
      mockEndpoints.push(
        {
          alias: 'list-mail-messages',
          method: 'get',
          path: '/me/messages',
          description: 'List mail',
          parameters: [],
        },
        {
          alias: 'list-calendar-events',
          method: 'get',
          path: '/me/events',
          description: 'List events',
          parameters: [],
        }
      );
      mockEndpointsJson = [
        {
          toolName: 'list-mail-messages',
          method: 'get',
          pathPattern: '/me/messages',
          scopes: ['Mail.Read'],
        },
        {
          toolName: 'list-calendar-events',
          method: 'get',
          pathPattern: '/me/events',
          scopes: ['Calendars.Read'],
        },
      ];

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(
        server as any,
        createMockGraphClient() as any,
        false,
        undefined,
        false,
        undefined,
        false,
        [],
        'Mail.Read'
      );

      expect(server.tools.has('list-mail-messages')).toBe(true);
      expect(server.tools.has('list-calendar-events')).toBe(false);
    });

    it('audits direct calls to Graph tools denied by allowed scopes', async () => {
      mockEndpoints.push({
        alias: 'get-drive-item',
        method: 'get',
        path: '/drives/:driveId/items/:driveItemId',
        description: 'Get drive item',
        parameters: [
          { name: 'driveId', type: 'Path', schema: z.string() },
          { name: 'driveItemId', type: 'Path', schema: z.string() },
        ],
      });
      mockEndpointsJson = [
        {
          toolName: 'get-drive-item',
          method: 'get',
          pathPattern: '/drives/{drive-id}/items/{driveItem-id}',
          scopes: ['Files.Read'],
        },
      ];

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(
        server as any,
        createMockGraphClient() as any,
        false,
        undefined,
        false,
        undefined,
        false,
        [],
        'Mail.Read'
      );
      const handler = server.server._requestHandlers.get('tools/call');

      await expect(
        handler?.(
          {
            method: 'tools/call',
            params: {
              name: 'get-drive-item',
              arguments: { driveId: 'drive-1', driveItemId: 'item-2' },
            },
          },
          {}
        )
      ).rejects.toThrow(/not found/);

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.denied',
          tool: 'get-drive-item',
          status: 'denied',
          reason: 'allowed_scopes',
          missing_scopes: ['Files.Read'],
          target_resource: {
            type: 'drive_item',
            id: '/drives/drive-1/items/item-2',
          },
        })
      );
    });

    it('discovery hides Graph tools outside the allowed scopes', async () => {
      mockEndpoints.push(
        {
          alias: 'list-mail-messages',
          method: 'get',
          path: '/me/messages',
          description: 'List mail',
          parameters: [],
        },
        {
          alias: 'list-calendar-events',
          method: 'get',
          path: '/me/events',
          description: 'List events',
          parameters: [],
        }
      );
      mockEndpointsJson = [
        {
          toolName: 'list-mail-messages',
          method: 'get',
          pathPattern: '/me/messages',
          scopes: ['Mail.Read'],
        },
        {
          toolName: 'list-calendar-events',
          method: 'get',
          pathPattern: '/me/events',
          scopes: ['Calendars.Read'],
        },
      ];

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(
        server as any,
        {} as any,
        false,
        false,
        undefined,
        false,
        [],
        undefined,
        'Mail.Read'
      );

      const result = await server.tools.get('search-tools')!.handler({ limit: 50 });
      const found = JSON.parse(result.content[0].text).tools.map((t: any) => t.name);
      expect(found).toContain('list-mail-messages');
      expect(found).not.toContain('list-calendar-events');
    });

    it('audits execute-tool attempts denied by allowed scopes', async () => {
      mockEndpoints.push({
        alias: 'get-drive-item',
        method: 'get',
        path: '/drives/:driveId/items/:driveItemId',
        description: 'Get drive item',
        parameters: [
          { name: 'driveId', type: 'Path', schema: z.string() },
          { name: 'driveItemId', type: 'Path', schema: z.string() },
        ],
      });
      mockEndpointsJson = [
        {
          toolName: 'get-drive-item',
          method: 'get',
          pathPattern: '/drives/{drive-id}/items/{driveItem-id}',
          scopes: ['Files.Read'],
        },
      ];

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(
        server as any,
        {} as any,
        false,
        false,
        undefined,
        false,
        [],
        undefined,
        'Mail.Read'
      );

      const result = await server.tools.get('execute-tool')!.handler({
        tool_name: 'get-drive-item',
        parameters: { driveId: 'drive-1', driveItemId: 'item-2' },
      });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toMatch(/not found/i);
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.denied',
          tool: 'get-drive-item',
          status: 'denied',
          reason: 'allowed_scopes',
          missing_scopes: ['Files.Read'],
          target_resource: {
            type: 'drive_item',
            id: '/drives/drive-1/items/item-2',
          },
        })
      );
    });

    it('audits direct discovery-mode calls to Graph tools denied by allowed scopes', async () => {
      mockEndpoints.push({
        alias: 'get-drive-item',
        method: 'get',
        path: '/drives/:driveId/items/:driveItemId',
        description: 'Get drive item',
        parameters: [
          { name: 'driveId', type: 'Path', schema: z.string() },
          { name: 'driveItemId', type: 'Path', schema: z.string() },
        ],
      });
      mockEndpointsJson = [
        {
          toolName: 'get-drive-item',
          method: 'get',
          pathPattern: '/drives/{drive-id}/items/{driveItem-id}',
          scopes: ['Files.Read'],
        },
      ];

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(
        server as any,
        {} as any,
        false,
        false,
        undefined,
        false,
        [],
        undefined,
        'Mail.Read'
      );
      const handler = server.server._requestHandlers.get('tools/call');

      await expect(
        handler?.(
          {
            method: 'tools/call',
            params: {
              name: 'get-drive-item',
              arguments: { driveId: 'drive-1', driveItemId: 'item-2' },
            },
          },
          {}
        )
      ).rejects.toThrow(/not found/);

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.denied',
          tool: 'get-drive-item',
          status: 'denied',
          reason: 'allowed_scopes',
          missing_scopes: ['Files.Read'],
          target_resource: {
            type: 'drive_item',
            id: '/drives/drive-1/items/item-2',
          },
        })
      );
    });
  });

  // ---- 11. Utility tools surface in --discovery mode ----
  describe('discovery mode: utility tools', () => {
    it('search-tools surfaces download-bytes for "download" queries', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(server as any, {} as any);

      const result = await server.tools.get('search-tools')!.handler({ query: 'download' });
      const payload = JSON.parse(result.content[0].text);
      const names = payload.tools.map((t: any) => t.name);
      expect(names).toContain('download-bytes');
    });

    it('get-tool-schema returns the download-bytes parameter schema', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(server as any, {} as any);

      const result = await server.tools
        .get('get-tool-schema')!
        .handler({ tool_name: 'download-bytes' });
      const schema = JSON.parse(result.content[0].text);
      expect(schema.name).toBe('download-bytes');
      expect(schema.path).toBe('tool:download-bytes');
      const targetParam = schema.parameters.find((p: any) => p.name === 'target');
      expect(targetParam).toBeDefined();
      expect(targetParam.required).toBe(true);
      expect(targetParam.description).toContain('authenticated recording bytes');
      expect(targetParam.description).not.toContain('returns a URL');
      expect(schema.description).toContain('For large drive/SharePoint file content');
    });

    it('execute-tool dispatches to download-bytes for a Graph path', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                contentType: 'image/png',
                encoding: 'base64',
                contentBytes: 'iVBORw0K',
              }),
            },
          ],
        }),
      };

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(server as any, graphClient as any);

      const result = await server.tools.get('execute-tool')!.handler({
        tool_name: 'download-bytes',
        parameters: { target: '/me/photo/$value' },
      });

      expect(result.isError).toBeFalsy();
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
      const [path] = graphClient.graphRequest.mock.calls[0];
      expect(path).toBe('/me/photo/$value');
    });

    it('execute-tool reports unknown tool when name matches neither registry', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(server as any, {} as any);

      const result = await server.tools.get('execute-tool')!.handler({
        tool_name: 'no-such-tool',
        parameters: {},
      });
      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/not found/i);
    });
  });

  // ---- 11. Discovery mode respects --enabled-tools ----
  describe('discovery mode: --enabled-tools filter', () => {
    it('search-tools only surfaces Graph tools matching the regex', async () => {
      mockEndpoints.push(
        {
          alias: 'list-mail-messages',
          method: 'get',
          path: '/me/messages',
          description: 'List mail',
          parameters: [],
        },
        {
          alias: 'list-calendar-events',
          method: 'get',
          path: '/me/events',
          description: 'List events',
          parameters: [],
        }
      );
      mockEndpointsJson = [
        { toolName: 'list-mail-messages', method: 'get', pathPattern: '/me/messages' },
        { toolName: 'list-calendar-events', method: 'get', pathPattern: '/me/events' },
      ];

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(server as any, {} as any, false, false, undefined, false, [], 'mail');

      const result = await server.tools.get('search-tools')!.handler({ limit: 50 });
      const found = JSON.parse(result.content[0].text).tools.map((t: any) => t.name);
      expect(found).toContain('list-mail-messages');
      expect(found).not.toContain('list-calendar-events');
    });

    it('audits execute-tool attempts denied by the enabled-tools allow-list', async () => {
      mockEndpoints.push(
        {
          alias: 'get-drive-item',
          method: 'get',
          path: '/drives/:driveId/items/:driveItemId',
          description: 'Get drive item',
          parameters: [
            { name: 'driveId', type: 'Path', schema: z.string() },
            { name: 'driveItemId', type: 'Path', schema: z.string() },
          ],
        },
        {
          alias: 'list-mail-messages',
          method: 'get',
          path: '/me/messages',
          description: 'List mail',
          parameters: [],
        }
      );
      mockEndpointsJson = [
        {
          toolName: 'get-drive-item',
          method: 'get',
          pathPattern: '/drives/{drive-id}/items/{driveItem-id}',
        },
        { toolName: 'list-mail-messages', method: 'get', pathPattern: '/me/messages' },
      ];

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(
        server as any,
        {} as any,
        false,
        false,
        undefined,
        false,
        [],
        '^list-mail-messages$'
      );

      const result = await server.tools.get('execute-tool')!.handler({
        tool_name: 'get-drive-item',
        parameters: { driveId: 'drive-1', driveItemId: 'item-2' },
      });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toMatch(/not found/i);
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'tool.denied',
          tool: 'get-drive-item',
          status: 'denied',
          reason: 'tool_allowlist',
          target_resource: {
            type: 'drive_item',
            id: '/drives/drive-1/items/item-2',
          },
        })
      );
    });

    it('utility tools obey the regex too', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(
        server as any,
        {} as any,
        false,
        false,
        undefined,
        false,
        [],
        '^download-bytes$'
      );

      const result = await server.tools.get('search-tools')!.handler({ limit: 50 });
      const found = JSON.parse(result.content[0].text).tools.map((t: any) => t.name);
      expect(found).toContain('download-bytes');
      expect(found).not.toContain('parse-teams-url');
    });

    it('invalid regex pattern is ignored, all tools surface', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(
        server as any,
        {} as any,
        false,
        false,
        undefined,
        false,
        [],
        '[invalid'
      );

      const result = await server.tools.get('search-tools')!.handler({ limit: 50 });
      const found = JSON.parse(result.content[0].text).tools.map((t: any) => t.name);
      expect(found).toContain('download-bytes');
      expect(found).toContain('parse-teams-url');
    });
  });

  // ---- 12. Read-only mode filters utility tools without readOnlyHint ----
  describe('utility tools in read-only mode', () => {
    it('skips utility tools whose readOnlyHint is not true', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, {} as any, true);

      // Both built-in utility tools (download-bytes, parse-teams-url) have
      // readOnlyHint: true so they should be present.
      expect(server.tools.has('download-bytes')).toBe(true);
      expect(server.tools.has('parse-teams-url')).toBe(true);
    });
  });

  // ---- destructive-operation confirm: true gate (CT-03) ----
  describe('destructive operations require confirm: true', () => {
    const prevRequireConfirm = process.env.MS365_MCP_REQUIRE_CONFIRM;

    beforeEach(() => {
      // The confirm gate is opt-in (off by default); enable it for the
      // gate-behaviour tests below. The default-off case is asserted explicitly.
      process.env.MS365_MCP_REQUIRE_CONFIRM = 'true';
    });

    afterEach(() => {
      if (prevRequireConfirm === undefined) delete process.env.MS365_MCP_REQUIRE_CONFIRM;
      else process.env.MS365_MCP_REQUIRE_CONFIRM = prevRequireConfirm;
    });

    it('rejects DELETE without confirm: true and does NOT call Graph', async () => {
      const endpoint = makeEndpoint({
        method: 'delete',
        path: '/me/messages/:message-id',
        alias: 'delete-mail-message',
      });
      const config = makeConfig({
        pathPattern: '/me/messages/{message-id}',
        method: 'delete',
        toolName: 'delete-mail-message',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient();
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('delete-mail-message');
      const result: any = await tool!.handler({ messageId: 'abc' });

      expect(graphClient.graphRequest).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toBe('confirmation_required');
      expect(payload.tool).toBe('delete-mail-message');
      expect(payload.destructive).toBe(true);
    });

    it('allows DELETE when confirm: true is passed', async () => {
      const endpoint = makeEndpoint({
        method: 'delete',
        path: '/me/messages/:message-id',
        alias: 'delete-mail-message',
      });
      const config = makeConfig({
        pathPattern: '/me/messages/{message-id}',
        method: 'delete',
        toolName: 'delete-mail-message',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ status: 204 }) }] },
      ]);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('delete-mail-message');
      await tool!.handler({ messageId: 'abc', confirm: true });

      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    });

    it('does NOT send `confirm` to Graph as a query/body parameter', async () => {
      const endpoint = makeEndpoint({
        method: 'post',
        path: '/me/sendMail',
        alias: 'send-mail',
        parameters: [{ name: 'message', type: 'Body', schema: z.any() }],
      });
      const config = makeConfig({
        pathPattern: '/me/sendMail',
        method: 'post',
        toolName: 'send-mail',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ status: 202 }) }] },
      ]);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('send-mail');
      await tool!.handler({ message: { subject: 'hi' }, confirm: true });

      const [url, opts] = graphClient.graphRequest.mock.calls[0];
      expect(url).not.toContain('confirm');
      // Body should be the message object, no `confirm` leaked
      const body = JSON.parse(opts.body);
      expect(body).not.toHaveProperty('confirm');
    });

    it('allows GET (read-only) regardless of confirm', async () => {
      const endpoint = makeEndpoint(); // default is GET
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ value: [] }) }] },
      ]);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('test-tool');
      await tool!.handler({}); // No confirm
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    });

    it('allows POST endpoints flagged readOnly without confirm (e.g. find-meeting-times)', async () => {
      const endpoint = makeEndpoint({
        method: 'post',
        path: '/me/findMeetingTimes',
        alias: 'find-meeting-times',
      });
      const config = makeConfig({
        pathPattern: '/me/findMeetingTimes',
        method: 'post',
        toolName: 'find-meeting-times',
        readOnly: true,
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ meetingTimeSuggestions: [] }) }] },
      ]);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('find-meeting-times');
      await tool!.handler({});
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    });

    it('does NOT gate when MS365_MCP_REQUIRE_CONFIRM is unset (opt-in, off by default)', async () => {
      delete process.env.MS365_MCP_REQUIRE_CONFIRM;
      const endpoint = makeEndpoint({
        method: 'delete',
        path: '/me/messages/:message-id',
        alias: 'delete-mail-message',
      });
      const config = makeConfig({
        pathPattern: '/me/messages/{message-id}',
        method: 'delete',
        toolName: 'delete-mail-message',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ status: 204 }) }] },
      ]);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('delete-mail-message');
      await tool!.handler({ messageId: 'abc' }); // No confirm — gate off by default
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    });

    it('does NOT gate when MS365_MCP_REQUIRE_CONFIRM=false (explicit off)', async () => {
      process.env.MS365_MCP_REQUIRE_CONFIRM = 'false';
      const endpoint = makeEndpoint({
        method: 'delete',
        path: '/me/messages/:message-id',
        alias: 'delete-mail-message',
      });
      const config = makeConfig({
        pathPattern: '/me/messages/{message-id}',
        method: 'delete',
        toolName: 'delete-mail-message',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ status: 204 }) }] },
      ]);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('delete-mail-message');
      await tool!.handler({ messageId: 'abc' }); // No confirm
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    });

    it('rejects `confirm: false` as not equal to true', async () => {
      const endpoint = makeEndpoint({
        method: 'patch',
        path: '/me/messages/:message-id',
        alias: 'update-mail-message',
      });
      const config = makeConfig({
        pathPattern: '/me/messages/{message-id}',
        method: 'patch',
        toolName: 'update-mail-message',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient();
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('update-mail-message');
      const result: any = await tool!.handler({ messageId: 'abc', confirm: false });
      expect(graphClient.graphRequest).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
    });

    it('exposes confirm in the schema only for destructive tools', async () => {
      // GET tool — no confirm
      mockEndpoints.push(makeEndpoint());
      mockEndpointsJson = [makeConfig()];

      // DELETE tool — confirm required
      mockEndpoints.push(
        makeEndpoint({ method: 'delete', alias: 'destructive-tool', path: '/me/items/:item-id' })
      );
      mockEndpointsJson.push(
        makeConfig({
          method: 'delete',
          toolName: 'destructive-tool',
          pathPattern: '/me/items/{item-id}',
        })
      );

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, createMockGraphClient() as any);

      expect(server.tools.get('test-tool')!.schema).not.toHaveProperty('confirm');
      expect(server.tools.get('destructive-tool')!.schema).toHaveProperty('confirm');
    });
  });

  // ---- 13. Server-side $select projection (#660) ----
  describe('$select projection', () => {
    // The onlineMeeting shape from #660: the caller asked for three fields and Graph
    // sent the whole resource back, invite HTML and passcode included.
    const untrimmed = {
      value: [
        {
          id: 'MSo',
          subject: 'Standup',
          joinWebUrl: 'https://teams/x',
          joinInformation: { content: '<div>invite</div>' },
          joinMeetingIdSettings: { passcode: '123456' },
        },
      ],
    };

    async function run(
      args: Record<string, unknown>,
      responses?: any[],
      outputFormat: 'json' | 'toon' = 'json'
    ) {
      mockEndpoints.push(makeEndpoint());
      mockEndpointsJson = [makeConfig()];
      const graphClient = createMockGraphClient(
        responses ?? [{ content: [{ type: 'text', text: JSON.stringify(untrimmed) }] }],
        outputFormat
      );
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);
      const result = await server.tools.get('test-tool')!.handler(args);
      return { result, graphClient };
    }

    it('narrows the body to the requested fields when Graph ignored $select', async () => {
      const { result } = await run({ select: 'id,subject,joinWebUrl' });
      expect(JSON.parse(result.content[0].text).value[0]).toEqual({
        id: 'MSo',
        subject: 'Standup',
        joinWebUrl: 'https://teams/x',
      });
    });

    it('leaves the body untouched when no select was passed', async () => {
      const { result } = await run({});
      expect(JSON.parse(result.content[0].text)).toEqual(untrimmed);
    });

    it('forces JSON so a --toon client still gets a trimmed body', async () => {
      const { result, graphClient } = await run({ select: 'id,subject' }, undefined, 'toon');
      expect(graphClient.graphRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ forceJsonOutput: true })
      );
      expect(result.content[0].text.startsWith('TOON:')).toBe(true);
      expect(result.content[0].text).not.toContain('joinInformation');
    });

    // Regression: the merge re-encodes to TOON, so projecting after it would JSON.parse
    // a TOON string, throw, and silently ship the untrimmed body.
    it('still projects when --toon and fetchAllPages are combined', async () => {
      const { result } = await run(
        { select: 'id,subject', fetchAllPages: true },
        [
          {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  value: [{ id: '1', subject: 'a', joinInformation: { content: 'huge' } }],
                  '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=1',
                }),
              },
            ],
          },
          {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  value: [{ id: '2', subject: 'b', joinInformation: { content: 'huge' } }],
                }),
              },
            ],
          },
        ],
        'toon'
      );
      expect(result.content[0].text.startsWith('TOON:')).toBe(true);
      expect(result.content[0].text).not.toContain('joinInformation');
      const merged = JSON.parse(result.content[0].text.slice('TOON:'.length));
      expect(merged.value).toEqual([
        { id: '1', subject: 'a' },
        { id: '2', subject: 'b' },
      ]);
    });

    // Binary and raw-text payloads are wrapped in an envelope; projecting one would
    // strip every key and lose the file or transcript.
    it('does not project a raw-text transport envelope', async () => {
      const envelope = { message: 'OK!', rawResponse: 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000' };
      const { result } = await run({ select: 'id' }, [
        { content: [{ type: 'text', text: JSON.stringify(envelope) }] },
      ]);
      expect(JSON.parse(result.content[0].text)).toEqual(envelope);
    });

    it('does not project a binary transport envelope', async () => {
      const envelope = {
        message: 'OK!',
        contentType: 'video/mp4',
        encoding: 'base64',
        contentLength: 3,
        contentBytes: 'AAA',
      };
      const { result } = await run({ select: 'id' }, [
        { content: [{ type: 'text', text: JSON.stringify(envelope) }] },
      ]);
      expect(JSON.parse(result.content[0].text)).toEqual(envelope);
    });

    // $select and $expand are independent in OData: the expanded property arrives in
    // addition to the selected fields and has to survive the projection.
    it('keeps an $expand-ed navigation property that was not selected', async () => {
      const { result } = await run({ select: 'subject', expand: 'attachments' }, [
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: '1',
                subject: 'a',
                attachments: [{ id: 'att1' }],
                bodyPreview: 'huge',
              }),
            },
          ],
        },
      ]);
      const body = JSON.parse(result.content[0].text);
      expect(body.attachments).toEqual([{ id: 'att1' }]);
      expect(body).not.toHaveProperty('bodyPreview');
    });

    // Graph never rejects a bad property name on the endpoints that ignore $select, so
    // a typo would otherwise silently reduce the response to {id}.
    it('returns the body untrimmed when no requested field is present', async () => {
      const body = { id: '1', joinWebUrl: 'u', joinInformation: { content: 'huge' } };
      const { result } = await run({ select: 'joinUrl' }, [
        { content: [{ type: 'text', text: JSON.stringify(body) }] },
      ]);
      expect(JSON.parse(result.content[0].text)).toEqual(body);
    });

    it('keeps the _etag that includeHeaders adds to a single resource', async () => {
      const { result } = await run({ select: 'subject', includeHeaders: true }, [
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ id: '1', subject: 'a', _etag: 'W/"1"', bodyPreview: 'huge' }),
            },
          ],
        },
      ]);
      expect(JSON.parse(result.content[0].text)).toEqual({
        id: '1',
        subject: 'a',
        _etag: 'W/"1"',
      });
    });

    // Asserting on the body alone passed even with the excludeResponse clause removed,
    // because { success: true } trips the envelope guard anyway. forceJsonOutput is the
    // signal that projection was never armed in the first place.
    it('does not arm projection when excludeResponse was requested', async () => {
      const { result, graphClient } = await run({ select: 'id', excludeResponse: true }, [
        { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] },
      ]);
      expect(graphClient.graphRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.objectContaining({ forceJsonOutput: true })
      );
      expect(JSON.parse(result.content[0].text)).toEqual({ success: true });
    });

    // An error body still reaches the merge block, which parses and re-serializes it, so
    // shouldProject is the only thing standing between it and the projection. Two keys
    // with one selected: if the guard goes, `code` disappears.
    it('does not project an error body on the merge path', async () => {
      const errorBody = { error: 'Microsoft Graph API error: 403 Forbidden', code: 'accessDenied' };
      const { result } = await run({ select: 'error', fetchAllPages: true }, [
        { content: [{ type: 'text', text: JSON.stringify(errorBody) }], isError: true },
      ]);
      expect(JSON.parse(result.content[0].text)).toEqual(errorBody);
    });

    // A page failing mid-merge replaces `response` with the error, which the guard
    // computed before the request cannot see.
    it('leaves an error from a later page alone', async () => {
      const errorBody = { error: 'Microsoft Graph API error: 503 Service Unavailable' };
      const { result } = await run(
        { select: 'error', fetchAllPages: true },
        [
          {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  value: [{ id: '1', subject: 'a' }],
                  '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=1',
                }),
              },
            ],
          },
          { content: [{ type: 'text', text: JSON.stringify(errorBody) }], isError: true },
        ],
        'toon'
      );
      expect(result.content[0].text.startsWith('TOON:')).toBe(false);
      expect(JSON.parse(result.content[0].text)).toEqual(errorBody);
    });

    // The llmTips tell the model to pass select=id,subject,joinWebUrl, so id is in the
    // list nearly every time; counting it as a match made the typo guard inert.
    it('returns the body untrimmed when the only real field is a typo alongside id', async () => {
      const { result } = await run({ select: 'id,joinUrl' });
      expect(JSON.parse(result.content[0].text)).toEqual(untrimmed);
    });
  });

  // ---- isDestructiveOperation helper ----
  describe('isDestructiveOperation', () => {
    it('returns true for POST, PATCH, PUT, DELETE', async () => {
      const { isDestructiveOperation } = await loadModule();
      expect(isDestructiveOperation('POST', undefined)).toBe(true);
      expect(isDestructiveOperation('PATCH', undefined)).toBe(true);
      expect(isDestructiveOperation('PUT', undefined)).toBe(true);
      expect(isDestructiveOperation('DELETE', undefined)).toBe(true);
    });

    it('is case-insensitive', async () => {
      const { isDestructiveOperation } = await loadModule();
      expect(isDestructiveOperation('delete', undefined)).toBe(true);
      expect(isDestructiveOperation('Patch', undefined)).toBe(true);
    });

    it('returns false for GET / HEAD / OPTIONS', async () => {
      const { isDestructiveOperation } = await loadModule();
      expect(isDestructiveOperation('GET', undefined)).toBe(false);
      expect(isDestructiveOperation('HEAD', undefined)).toBe(false);
      expect(isDestructiveOperation('OPTIONS', undefined)).toBe(false);
    });

    it('returns false for POST endpoints flagged readOnly', async () => {
      const { isDestructiveOperation } = await loadModule();
      expect(isDestructiveOperation('POST', { readOnly: true } as any)).toBe(false);
    });

    it('still returns true for PATCH/DELETE even if config.readOnly is set (should not happen but defensive)', async () => {
      const { isDestructiveOperation } = await loadModule();
      expect(isDestructiveOperation('PATCH', { readOnly: true } as any)).toBe(true);
      expect(isDestructiveOperation('DELETE', { readOnly: true } as any)).toBe(true);
    });
  });
});
