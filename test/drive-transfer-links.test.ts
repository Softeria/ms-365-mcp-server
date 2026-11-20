import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Readable } from 'node:stream';
import { UTILITY_TOOLS } from '../src/graph-tools.js';
import { AttachmentTicketStore, TICKET_PARAM } from '../src/lib/attachment-tickets.js';
import {
  configureAttachmentMinting,
  resetAttachmentMinting,
} from '../src/lib/attachment-minting.js';
import { createAttachmentUploadHandler } from '../src/attachment-route.js';

vi.mock('../src/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  enableConsoleLogging: vi.fn(),
}));

/**
 * Short server links for OneDrive and SharePoint files (#750): with
 * --enable-attachment-urls on, get-download-url mints this server's own link for a
 * drive file instead of Graph's ~1,300-character one, and get-upload-url takes a drive
 * folder as its target.
 */
const FOLDER = '/me/drive/items/FOLDER';
const CHUNK = 320 * 1024 * 12;

const authManager = {
  isOAuthModeEnabled: () => false,
  isMultiAccount: async () => false,
  getToken: async () => 'SERVER_OWN_TOKEN',
  getTokenForAccount: async () => 'SERVER_OWN_TOKEN',
};

function ctx(graphClient: unknown = {}) {
  return {
    graphClient: graphClient as never,
    authManager: authManager as never,
    multiAccount: false,
    accountNames: [],
  };
}

function parse(result: unknown) {
  return JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
}

function ticketIdOf(url: string): string {
  return new URL(url).searchParams.get(TICKET_PARAM)!;
}

function makeReq(body: Buffer, ticketId: string) {
  const req = Readable.from([body]) as Readable & Record<string, unknown>;
  req.method = 'PUT';
  req.headers = { 'content-length': String(body.length) };
  req.query = { [TICKET_PARAM]: ticketId };
  return req as never;
}

function makeRes() {
  return {
    statusCode: 200,
    headersSent: false,
    jsonBody: undefined as unknown,
    textBody: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    type() {
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    send(body: unknown) {
      this.headersSent = true;
      this.textBody = body;
      return this;
    },
    json(body: unknown) {
      this.headersSent = true;
      this.jsonBody = body;
      return this;
    },
  };
}

let store: AttachmentTicketStore;

beforeEach(() => {
  store = new AttachmentTicketStore(120);
  configureAttachmentMinting({
    store,
    config: { base: 'https://relay.example', key: 'k', keyId: '1', ttlSeconds: 120 },
  });
});

afterEach(() => {
  resetAttachmentMinting();
  vi.restoreAllMocks();
});

describe('get-download-url for drive files', () => {
  const tool = UTILITY_TOOLS.find((t) => t.name === 'get-download-url')!;
  const GRAPH_URL = `https://contoso.sharepoint.com/download.aspx?tempauth=${'x'.repeat(1200)}`;

  function driveClient(item: Record<string, unknown>) {
    return {
      graphRequest: vi.fn(async () => ({
        content: [{ type: 'text', text: JSON.stringify(item) }],
      })),
    };
  }

  it('mints a short server link for a drive file, keeping name, size and type', async () => {
    const client = driveClient({
      name: 'report.pdf',
      size: 1234,
      file: { mimeType: 'application/pdf' },
      '@microsoft.graph.downloadUrl': GRAPH_URL,
    });
    const result = await tool.execute({ target: '/drives/D1/items/I1/content' }, ctx(client));
    expect(result.isError).toBeFalsy();
    const body = parse(result);
    expect(body.downloadUrl.startsWith('https://relay.example/attachment?')).toBe(true);
    expect(body.downloadUrl.length).toBeLessThan(300);
    expect(body).toMatchObject({
      name: 'report.pdf',
      size: 1234,
      contentType: 'application/pdf',
      singleUse: true,
    });
    expect(store.redeem(ticketIdOf(body.downloadUrl))).toMatchObject({
      purpose: 'download',
      target: '/drives/D1/items/I1/content',
      probedName: 'report.pdf',
      probedContentType: 'application/pdf',
    });
  });

  it('mints by item id for a path-addressed file whose name has spaces or æ', async () => {
    const client = driveClient({
      id: 'ITEM1',
      name: 'Q1 Årsrapport.pdf',
      size: 10,
      file: { mimeType: 'application/pdf' },
      parentReference: { driveId: 'b!DRIVE' },
      '@microsoft.graph.downloadUrl': GRAPH_URL,
    });
    const result = await tool.execute(
      { target: '/me/drive/root:/Docs/Q1 Årsrapport.pdf:/content' },
      ctx(client)
    );
    expect(result.isError).toBeFalsy();
    const body = parse(result);
    expect(store.redeem(ticketIdOf(body.downloadUrl))).toMatchObject({
      target: '/drives/b!DRIVE/items/ITEM1/content',
      probedName: 'Q1 Årsrapport.pdf',
    });
  });

  it('refuses a folder instead of minting a link to it', async () => {
    const client = driveClient({ name: 'Docs', folder: { childCount: 3 } });
    const result = await tool.execute({ target: '/me/drive/items/F1' }, ctx(client));
    expect(result.isError).toBe(true);
    expect(parse(result).error).toMatch(/folder/);
    expect(store.size()).toBe(0);
  });

  it('returns the Graph URL as before when attachment URLs are not enabled', async () => {
    resetAttachmentMinting();
    const client = driveClient({
      name: 'report.pdf',
      size: 1234,
      file: { mimeType: 'application/pdf' },
      '@microsoft.graph.downloadUrl': GRAPH_URL,
    });
    const result = await tool.execute({ target: '/me/drive/items/I1' }, ctx(client));
    expect(parse(result).downloadUrl).toBe(GRAPH_URL);
  });
});

describe('get-upload-url for drive folders', () => {
  const tool = UTILITY_TOOLS.find((t) => t.name === 'get-upload-url')!;

  it('mints a drive upload ticket for each folder form, defaulting to fail on a name clash', async () => {
    for (const target of [
      '/me/drive/root',
      FOLDER,
      '/drives/D1/items/F1',
      '/drives/D1/root',
      '/sites/S1/drive/items/F1',
      '/sites/S1/drives/D1/items/F1',
      '/groups/G1/drive/root',
      '/users/U1/drive/items/F1',
    ]) {
      const result = await tool.execute({ target, name: 'report.pdf' }, ctx());
      expect(result.isError, target).toBeFalsy();
      const body = parse(result);
      expect(body.conflictBehavior).toBe('fail');
      expect(store.redeem(ticketIdOf(body.uploadUrl)), target).toMatchObject({
        purpose: 'upload',
        target,
        name: 'report.pdf',
        drive: { conflictBehavior: 'fail' },
      });
    }
  });

  it('records the conflictBehavior it is given', async () => {
    const result = await tool.execute(
      { target: FOLDER, name: 'a.txt', conflictBehavior: 'replace' },
      ctx()
    );
    expect(store.redeem(ticketIdOf(parse(result).uploadUrl))).toMatchObject({
      drive: { conflictBehavior: 'replace' },
    });
  });

  it('refuses names that are not a plain file name, contentId, and bad conflictBehavior', async () => {
    for (const name of [
      'a/b.txt',
      'a\\b.txt',
      'a:b.txt',
      'what?.txt',
      'x|y',
      '"q"',
      // Would be cleaned into a different name, which replace would then overwrite.
      'report.txt ',
      ' report.txt',
      'a\u0001b.txt',
      'x'.repeat(256),
      '.',
      '..',
      'trailing.',
      'lone\ud800.txt',
    ]) {
      const result = await tool.execute({ target: FOLDER, name }, ctx());
      expect(result.isError, name).toBe(true);
    }
    const withContentId = await tool.execute(
      { target: FOLDER, name: 'a.png', contentId: 'pic' },
      ctx()
    );
    expect(withContentId.isError).toBe(true);
    const badBehavior = await tool.execute(
      { target: FOLDER, name: 'a.txt', conflictBehavior: 'overwrite' },
      ctx()
    );
    expect(badBehavior.isError).toBe(true);
    const behaviorOnMail = await tool.execute(
      { target: '/me/messages/M1/attachments', name: 'a.txt', conflictBehavior: 'replace' },
      ctx()
    );
    expect(behaviorOnMail.isError).toBe(true);
    expect(store.size()).toBe(0);
  });

  it('refuses drive paths that are not a folder by id or a root', async () => {
    for (const target of [
      '/me/drive/root/children',
      '/me/drive/root:/Docs:',
      '/me/drive/items/F1/content',
      '/me/drive/items/../F1',
    ]) {
      const result = await tool.execute({ target, name: 'a.txt' }, ctx());
      expect(result.isError, target).toBe(true);
    }
    expect(store.size()).toBe(0);
  });

  it('points at the drive upload tools when attachment URLs are not enabled', async () => {
    resetAttachmentMinting();
    const result = await tool.execute({ target: FOLDER, name: 'a.txt' }, ctx());
    expect(result.isError).toBe(true);
    expect(parse(result).error).toMatch(/upload-file-content|create-upload-session/);
  });
});

describe('several files in one call', () => {
  const download = UTILITY_TOOLS.find((t) => t.name === 'get-download-url')!;
  const upload = UTILITY_TOOLS.find((t) => t.name === 'get-upload-url')!;

  // Answers each item path with a file named after its id, or a folder for /items/FOLDER.
  const driveClient = {
    graphRequest: vi.fn(async (path: string) => {
      const id = path.split('/').pop()!;
      const item = id === 'FOLDER' ? { name: 'Docs', folder: {} } : { name: `${id}.pdf`, size: 1 };
      return { content: [{ type: 'text', text: JSON.stringify(item) }] };
    }),
  };

  it('mints one download link per target, in order, each naming its target', async () => {
    const targets = ['/drives/D1/items/A/content', '/drives/D1/items/B', '/me/drive/items/C'];
    const result = await download.execute({ targets }, ctx(driveClient));
    expect(result.isError).toBeFalsy();
    const { results } = parse(result);
    expect(results.map((r: { target: string }) => r.target)).toEqual(targets);
    expect(results.map((r: { name: string }) => r.name)).toEqual(['A.pdf', 'B.pdf', 'C.pdf']);
    expect(store.redeem(ticketIdOf(results[1].downloadUrl))).toMatchObject({
      purpose: 'download',
      target: '/drives/D1/items/B/content',
    });
    expect(store.size()).toBe(2);
  });

  it('fails only the entry that fails, and the call only when every entry fails', async () => {
    const result = await download.execute(
      { targets: ['/drives/D1/items/A', '/me/drive/items/FOLDER', '/drives/D1/items/../A'] },
      ctx(driveClient)
    );
    expect(result.isError).toBeFalsy();
    const { results } = parse(result);
    expect(results[0].downloadUrl).toBeDefined();
    expect(results[1].error).toMatch(/folder/);
    expect(results[2].error).toBeDefined();
    expect(store.size()).toBe(1);

    const allFailed = await download.execute(
      { targets: ['/me/drive/items/FOLDER', 'no-slash'] },
      ctx(driveClient)
    );
    expect(allFailed.isError).toBe(true);
    expect(parse(allFailed).results).toHaveLength(2);
  });

  it('refuses an empty or too long list, and a list next to single-entry fields', async () => {
    const tooLong = Array.from({ length: 21 }, (_, i) => `/drives/D1/items/I${i}`);
    for (const params of [
      { targets: [] },
      { targets: tooLong },
      { targets: '/drives/D1/items/A' },
      { targets: ['/drives/D1/items/A'], target: '/drives/D1/items/B' },
    ]) {
      const result = await download.execute(params, ctx(driveClient));
      expect(result.isError, JSON.stringify(params).slice(0, 80)).toBe(true);
    }
    for (const params of [
      { files: [{ target: FOLDER, name: 'a.txt' }], name: 'b.txt' },
      { files: [{ target: FOLDER, name: 'a.txt' }], conflictBehavior: 'replace' },
    ]) {
      expect((await upload.execute(params, ctx())).isError).toBe(true);
    }
    expect(store.size()).toBe(0);
  });

  it('treats an empty list field as absent', async () => {
    const result = await download.execute(
      { target: '/drives/D1/items/A', targets: null },
      ctx(driveClient)
    );
    expect(parse(result).downloadUrl).toBeDefined();
  });

  it('mints one upload ticket per file with its own name and conflictBehavior', async () => {
    const result = await upload.execute(
      {
        files: [
          { target: FOLDER, name: 'a.md', conflictBehavior: 'replace' },
          { target: '/drives/D1/items/F2', name: 'b.png' },
        ],
        conflictBehavior: '',
      },
      ctx()
    );
    expect(result.isError).toBeFalsy();
    const { results } = parse(result);
    expect(results).toMatchObject([
      { target: FOLDER, name: 'a.md', conflictBehavior: 'replace' },
      { target: '/drives/D1/items/F2', name: 'b.png', conflictBehavior: 'fail' },
    ]);
    expect(store.redeem(ticketIdOf(results[0].uploadUrl))).toMatchObject({
      target: FOLDER,
      name: 'a.md',
      drive: { conflictBehavior: 'replace' },
    });
    expect(store.redeem(ticketIdOf(results[1].uploadUrl))).toMatchObject({
      target: '/drives/D1/items/F2',
      name: 'b.png',
      drive: { conflictBehavior: 'fail' },
    });
  });

  it('checks every upload entry on its own', async () => {
    const result = await upload.execute(
      {
        files: [
          { target: FOLDER, name: 'ok.txt' },
          { target: FOLDER, name: 'a/b.txt' },
          { target: '/me/drive/root:/Docs:', name: 'c.txt' },
          'not an entry',
        ],
      },
      ctx()
    );
    expect(result.isError).toBeFalsy();
    const { results } = parse(result);
    expect(results[0].uploadUrl).toBeDefined();
    expect(results.slice(1).every((r: { error?: string }) => r.error)).toBe(true);
    expect(store.size()).toBe(1);
  });

  it('tells the audit log how many links it handed out', async () => {
    const client = {
      graphRequest: vi.fn(async (path: string) =>
        path.endsWith('/GONE')
          ? { content: [{ type: 'text', text: 'Bad gateway' }], isError: true }
          : driveClient.graphRequest(path)
      ),
    };
    const result = await download.execute(
      { targets: ['/drives/D1/items/A', '/drives/D1/items/GONE', '/drives/D1/items/B'] },
      ctx(client)
    );
    expect(result.isError).toBeFalsy();
    expect(result._meta).toEqual({ result_count: 2 });
    expect(parse(result).results[1]).toEqual({
      target: '/drives/D1/items/GONE',
      error: 'Bad gateway',
    });
  });

  it('turns a throwing entry into its own error and goes on with the rest', async () => {
    const original = store.mintUpload.bind(store);
    vi.spyOn(store, 'mintUpload')
      .mockImplementationOnce(() => {
        throw new Error('boom');
      })
      .mockImplementationOnce(() => {
        throw null;
      })
      .mockImplementation(original);
    const result = await upload.execute(
      {
        files: [
          { target: FOLDER, name: 'a.txt' },
          { target: FOLDER, name: 'b.txt' },
          { target: FOLDER, name: 'c.txt' },
        ],
      },
      ctx()
    );
    expect(result.isError).toBeFalsy();
    const { results } = parse(result);
    expect(results[0]).toEqual({ target: FOLDER, name: 'a.txt', error: 'boom' });
    expect(results[1]).toEqual({ target: FOLDER, name: 'b.txt', error: 'null' });
    expect(results[2].uploadUrl).toBeDefined();
    expect(result._meta).toEqual({ result_count: 1 });
  });

  it('names each upload as it will be stored, alone or in a list', async () => {
    const target = '/me/messages/M1/attachments';
    const single = await upload.execute({ target, name: '  report.pdf ' }, ctx());
    expect(parse(single).name).toBe('report.pdf');
    const list = await upload.execute({ files: [{ target, name: '  report.pdf ' }] }, ctx());
    expect(parse(list).results[0].name).toBe('report.pdf');
  });
});

describe('PUT /attachment with a drive upload ticket', () => {
  const graphClient = { makeRequest: vi.fn() };
  const deps = () => ({
    store,
    getGraphClient: () => graphClient as never,
    authManager: authManager as never,
  });
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    graphClient.makeRequest.mockReset();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mintDrive(conflictBehavior: 'fail' | 'replace' | 'rename' = 'fail') {
    return store.mintUpload(FOLDER, undefined, {
      name: 'big report.pdf',
      contentType: 'application/pdf',
      drive: { conflictBehavior },
    }).id;
  }

  it('creates the file through an upload session, in chunks, and returns the driveItem', async () => {
    const size = CHUNK + 1000;
    graphClient.makeRequest.mockResolvedValue({ uploadUrl: 'https://up.example/session' });
    const puts: Array<{ range: string; auth?: string }> = [];
    global.fetch = vi.fn(async (_url: unknown, init: { headers: Record<string, string> }) => {
      puts.push({ range: init.headers['Content-Range'], auth: init.headers['Authorization'] });
      const done = puts.length === 2;
      return {
        status: done ? 201 : 202,
        json: async () =>
          done ? { id: 'NEW', name: 'big report.pdf', size, webUrl: 'https://x/y' } : {},
      } as Response;
    }) as never;

    const handler = createAttachmentUploadHandler(deps());
    const res = makeRes();
    await handler(makeReq(Buffer.alloc(size, 7), mintDrive('rename')), res as never);

    expect(res.statusCode).toBe(201);
    expect(res.jsonBody).toEqual({
      ok: true,
      name: 'big report.pdf',
      size,
      id: 'NEW',
      webUrl: 'https://x/y',
    });
    const [sessionPath, options] = graphClient.makeRequest.mock.calls[0];
    expect(sessionPath).toBe(`${FOLDER}:/big%20report.pdf:/createUploadSession`);
    expect(options.method).toBe('POST');
    expect(options.accessToken).toBe('SERVER_OWN_TOKEN');
    expect(JSON.parse(options.body)).toEqual({
      item: { '@microsoft.graph.conflictBehavior': 'rename', name: 'big report.pdf' },
    });
    // Graph's upload URL is pre-authenticated; sending the token there can 401.
    expect(puts).toEqual([
      { range: `bytes 0-${CHUNK - 1}/${size}`, auth: undefined },
      { range: `bytes ${CHUNK}-${size - 1}/${size}`, auth: undefined },
    ]);
  });

  it('uses an upload session for a small file too, in one chunk', async () => {
    graphClient.makeRequest.mockResolvedValue({ uploadUrl: 'https://up.example/session' });
    global.fetch = vi.fn(async () => ({
      status: 201,
      json: async () => ({ id: 'SMALL' }),
    })) as never;
    const handler = createAttachmentUploadHandler(deps());
    const res = makeRes();
    await handler(makeReq(Buffer.from('hello'), mintDrive()), res as never);
    expect(res.statusCode).toBe(201);
    expect(res.jsonBody).toMatchObject({ id: 'SMALL', size: 5 });
    expect(graphClient.makeRequest.mock.calls[0][0]).toMatch(/:\/createUploadSession$/);
  });

  it('answers 409 when the name is taken and conflictBehavior is fail', async () => {
    graphClient.makeRequest.mockResolvedValue({ uploadUrl: 'https://up.example/session' });
    global.fetch = vi.fn(async () => ({ status: 409, json: async () => ({}) })) as never;
    const handler = createAttachmentUploadHandler(deps());
    const res = makeRes();
    await handler(makeReq(Buffer.from('hello'), mintDrive()), res as never);
    expect(res.statusCode).toBe(409);
    expect(String(res.textBody)).toMatch(/conflictBehavior/);
  });

  it('answers 409 when Graph refuses the session itself over the name', async () => {
    graphClient.makeRequest.mockRejectedValue(
      Object.assign(new Error('Microsoft Graph API error: 409 Conflict - nameAlreadyExists'), {
        httpStatus: 409,
      })
    );
    const handler = createAttachmentUploadHandler(deps());
    const res = makeRes();
    await handler(makeReq(Buffer.from('hello'), mintDrive()), res as never);
    expect(res.statusCode).toBe(409);
  });

  it('answers 502, not 409, for another session error, even one that mentions 409', async () => {
    graphClient.makeRequest.mockRejectedValue(
      Object.assign(new Error('Microsoft Graph API error: 403 - item 409 is locked'), {
        httpStatus: 403,
      })
    );
    const handler = createAttachmentUploadHandler(deps());
    const res = makeRes();
    await handler(makeReq(Buffer.from('hello'), mintDrive()), res as never);
    expect(res.statusCode).toBe(502);
  });

  it('fails, and cancels the session, when the last chunk does not commit the file', async () => {
    graphClient.makeRequest.mockResolvedValue({ uploadUrl: 'https://up.example/session' });
    const calls: string[] = [];
    global.fetch = vi.fn(async (_url: unknown, init: { method: string }) => {
      calls.push(init.method);
      return { status: 202, json: async () => ({ nextExpectedRanges: ['0-'] }) } as Response;
    }) as never;
    const handler = createAttachmentUploadHandler(deps());
    const res = makeRes();
    await handler(makeReq(Buffer.from('hello'), mintDrive()), res as never);
    expect(res.statusCode).toBe(502);
    expect(calls).toEqual(['PUT', 'DELETE']);
  });

  it('cancels the session when the source ends short', async () => {
    graphClient.makeRequest.mockResolvedValue({ uploadUrl: 'https://up.example/session' });
    const calls: string[] = [];
    global.fetch = vi.fn(async (_url: unknown, init: { method: string }) => {
      calls.push(init.method);
      return { status: 202, json: async () => ({}) } as Response;
    }) as never;
    const id = mintDrive();
    const req = makeReq(Buffer.from('hello'), id) as unknown as Record<string, unknown>;
    (req.headers as Record<string, string>)['content-length'] = '10';
    const handler = createAttachmentUploadHandler(deps());
    const res = makeRes();
    await handler(req as never, res as never);
    expect(res.statusCode).toBe(502);
    expect(calls).toEqual(['PUT', 'DELETE']);
  });

  it('reports the name Graph chose when conflictBehavior is rename', async () => {
    graphClient.makeRequest.mockResolvedValue({ uploadUrl: 'https://up.example/session' });
    global.fetch = vi.fn(async () => ({
      status: 201,
      json: async () => ({ id: 'R1', name: 'big report 1.pdf', size: 5 }),
    })) as never;
    const handler = createAttachmentUploadHandler(deps());
    const res = makeRes();
    await handler(makeReq(Buffer.from('hello'), mintDrive('rename')), res as never);
    expect(res.statusCode).toBe(201);
    expect(res.jsonBody).toMatchObject({ id: 'R1', name: 'big report 1.pdf' });
  });

  it('still attaches to a draft when the ticket has no drive part', async () => {
    graphClient.makeRequest.mockResolvedValue({ id: 'ATT' });
    const { id } = store.mintUpload('/me/messages/M1/attachments', undefined, {
      name: 'a.txt',
      contentType: 'text/plain',
    });
    const handler = createAttachmentUploadHandler(deps());
    const res = makeRes();
    await handler(makeReq(Buffer.from('hi'), id), res as never);
    expect(res.statusCode).toBe(201);
    expect(graphClient.makeRequest.mock.calls[0][0]).toBe('/me/messages/M1/attachments');
  });
});
