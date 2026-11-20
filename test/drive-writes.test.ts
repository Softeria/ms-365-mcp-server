/**
 * OneDrive/SharePoint file writes, through the real GraphClient with only
 * `fetch` stubbed. Each guard must refuse BEFORE any write reaches Graph.
 */
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import GraphClient from '../src/graph-client.js';
import { executeTool } from '../src/tool-runtime.js';
import { ALL_TOOLS, type Tool } from '../src/tools/index.js';
import { requestContext } from '../src/request-context.js';
import { MAX_UPLOAD_BYTES } from '../src/tools/drive-writes.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const findTool = (name: string) => ALL_TOOLS.find((t) => t.name === name) as Tool;

type Init = { method?: string; headers?: Record<string, string>; body?: unknown };

const UPLOAD_URL = 'https://upload.test/session-1';

/**
 * Items by id; GETs return them. createUploadSession returns `session`
 * (default: an upload URL); every other write returns `written`. A Response
 * is returned as-is.
 */
function stubGraph(
  items: Record<string, unknown>,
  written: unknown = {},
  session: unknown = { uploadUrl: UPLOAD_URL }
): Mock {
  const fetchMock = vi.fn().mockImplementation(async (raw: string, init: Init = {}) => {
    const url = new URL(raw);
    if (!init.method || init.method === 'GET') {
      const id = decodeURIComponent(url.pathname.split('/').pop() ?? '');
      return id in items ? Response.json(items[id]) : new Response('{}', { status: 404 });
    }
    const out = url.pathname.endsWith('/createUploadSession') ? session : written;
    return out instanceof Response ? out : Response.json(out);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const writes = (fetchMock: Mock) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method && init.method !== 'GET');

async function run(name: string, params: Record<string, unknown>) {
  const result = await requestContext.run({ accessToken: 't' }, () =>
    executeTool(findTool(name), new GraphClient(), params)
  );
  return { result, text: result.content[0].text };
}

const file = (id: string, driveId = 'D1') => ({
  id,
  name: `${id}.docx`,
  eTag: `"{${id}},4"`,
  file: {},
  parentReference: { driveId },
});
const folder = (id: string, driveId = 'D1') => ({
  id,
  name: id,
  folder: { childCount: 0 },
  parentReference: { driveId },
});
const newItem = {
  id: 'n1',
  name: 'Q3 model.xlsx',
  size: 3,
  webUrl: 'https://x/n1',
  eTag: '"{n1},1"',
  file: { mimeType: 'application/vnd.ms-excel', hashes: { quickXorHash: 'x' } },
  parentReference: { driveId: 'D1', id: 'p1', path: '/drive/root:' },
  createdBy: { user: { displayName: 'Jane' } },
};

afterEach(() => vi.unstubAllGlobals());

describe('drive-file-upload', () => {
  it('creates a fail-on-conflict upload session, then sends the bytes without the bearer token', async () => {
    const fetchMock = stubGraph({}, newItem);
    const { result, text } = await run('drive-file-upload', {
      'parent-id': 'p1',
      name: 'Q3 model.xlsx',
      contentBytes: Buffer.from('abc').toString('base64'),
    });
    expect(result.isError).toBeFalsy();
    const [[sessionUrl, sessionInit], [uploadUrl, uploadInit]] = writes(fetchMock);
    expect(sessionUrl).toBe(
      'https://graph.microsoft.com/v1.0/me/drive/items/p1:/Q3%20model.xlsx:/createUploadSession'
    );
    expect(JSON.parse(sessionInit.body)).toEqual({
      item: { '@microsoft.graph.conflictBehavior': 'fail' },
    });
    expect(uploadUrl).toBe(UPLOAD_URL);
    expect(uploadInit.method).toBe('PUT');
    expect(uploadInit.headers).not.toHaveProperty('Authorization');
    expect(uploadInit.headers['Content-Range']).toBe('bytes 0-2/3');
    expect(Buffer.from(uploadInit.body).toString()).toBe('abc');
    expect(JSON.parse(text)).toEqual({
      id: 'n1',
      name: 'Q3 model.xlsx',
      mimeType: 'application/vnd.ms-excel',
      size: 3,
      webUrl: 'https://x/n1',
      driveId: 'D1',
      parentId: 'p1',
      eTag: '"{n1},1"',
    });
  });

  it('targets a SharePoint drive root when drive-id is given and parent-id omitted', async () => {
    const fetchMock = stubGraph({}, newItem);
    await run('drive-file-upload', { 'drive-id': 'D9', name: 'a.txt', contentBytes: 'YQ==' });
    expect(writes(fetchMock)[0][0]).toBe(
      'https://graph.microsoft.com/v1.0/drives/D9/root:/a.txt:/createUploadSession'
    );
  });

  it('a name created after the check makes Graph reject the commit (409); the session is discarded', async () => {
    const fetchMock = stubGraph(
      {},
      new Response('{"error":{"code":"nameAlreadyExists"}}', { status: 409 })
    );
    const { result, text } = await run('drive-file-upload', {
      'parent-id': 'p1',
      name: 'a.txt',
      contentBytes: 'YQ==',
    });
    expect(result.isError).toBe(true);
    expect(text).toMatch(/409/);
    const last = writes(fetchMock).at(-1)!;
    expect(last[0]).toBe(UPLOAD_URL);
    expect(last[1].method).toBe('DELETE');
  });

  it.each([
    [{ name: 'a/b.txt', contentBytes: 'YQ==' }, /not a valid file\/folder name/],
    [{ name: 'report.', contentBytes: 'YQ==' }, /not a valid/],
    [{ name: 'a.txt', contentBytes: 'not base64!' }, /base64/],
    [
      { name: 'a.txt', contentBytes: Buffer.alloc(MAX_UPLOAD_BYTES + 1).toString('base64') },
      /limit/,
    ],
    [{ name: 'a.txt', contentBytes: 'YQ==', 'parent-id': '..' }, /single opaque id/],
    [{ name: 'a.txt', contentBytes: 'YQ==', 'parent-id': 'p1:/x' }, /single opaque id/],
    [{ name: 'a.txt', contentBytes: 'YQ==', 'drive-id': 'D/1' }, /single opaque id/],
  ])('refuses %# without calling Graph', async (params, message) => {
    const fetchMock = stubGraph({});
    const { result, text } = await run('drive-file-upload', params);
    expect(result.isError).toBe(true);
    expect(text).toMatch(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a name that already exists, before PUTting', async () => {
    const fetchMock = stubGraph({ 'a.txt:': { id: 'existing' } });
    const { result, text } = await run('drive-file-upload', {
      'parent-id': 'p1',
      name: 'a.txt',
      contentBytes: 'YQ==',
    });
    expect(result.isError).toBe(true);
    expect(text).toMatch(/already exists/);
    expect(text).toMatch(/precondition failed/i);
    expect(writes(fetchMock)).toHaveLength(0);
  });
});

describe('drive-file-update', () => {
  it('sends If-Match with the eTag the agent read when creating the upload session', async () => {
    const fetchMock = stubGraph({ f1: file('f1') }, newItem);
    await run('drive-file-update', { 'item-id': 'f1', eTag: '"{f1},4"', contentBytes: 'YQ==' });
    const [url, init] = writes(fetchMock)[0];
    expect(url).toBe('https://graph.microsoft.com/v1.0/me/drive/items/f1/createUploadSession');
    expect(init.headers['If-Match']).toBe('"{f1},4"');
    expect(writes(fetchMock)[1][0]).toBe(UPLOAD_URL);
  });

  it('an edit after the check makes Graph refuse the session (412); no bytes are sent', async () => {
    const fetchMock = stubGraph(
      { f1: file('f1') },
      newItem,
      new Response('{"error":{"code":"resourceModified"}}', { status: 412 })
    );
    const { result, text } = await run('drive-file-update', {
      'item-id': 'f1',
      eTag: '"{f1},4"',
      contentBytes: 'YQ==',
    });
    expect(result.isError).toBe(true);
    expect(text).toMatch(/412/);
    expect(writes(fetchMock).some(([u]) => u === UPLOAD_URL)).toBe(false);
  });

  it.each([
    ['"*" (match-anything)', '*'],
    ['an unquoted value', '{f1},4'],
    ['a stale eTag', '"{f1},3"'],
  ])('refuses %s without writing', async (_label, eTag) => {
    const fetchMock = stubGraph({ f1: file('f1') }, newItem);
    const { result, text } = await run('drive-file-update', {
      'item-id': 'f1',
      eTag,
      contentBytes: 'YQ==',
    });
    expect(result.isError).toBe(true);
    expect(text).toMatch(/eTag/);
    expect(writes(fetchMock)).toHaveLength(0);
  });

  it('refuses a folder and a missing eTag before writing', async () => {
    let fetchMock = stubGraph({ d1: folder('d1') });
    expect(
      (await run('drive-file-update', { 'item-id': 'd1', eTag: '"e"', contentBytes: 'YQ==' }))
        .result.isError
    ).toBe(true);
    expect(writes(fetchMock)).toHaveLength(0);
    fetchMock = stubGraph({ f1: file('f1') });
    expect(
      (await run('drive-file-update', { 'item-id': 'f1', contentBytes: 'YQ==' })).result.isError
    ).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('drive-folder-create and drive-item-rename', () => {
  it('creates a folder that fails on a name clash', async () => {
    const fetchMock = stubGraph(
      {},
      { ...newItem, name: 'Deals', file: undefined, folder: { childCount: 0 } }
    );
    await run('drive-folder-create', { name: 'Deals' });
    const [url, init] = writes(fetchMock)[0];
    expect(url).toBe('https://graph.microsoft.com/v1.0/me/drive/root/children');
    expect(JSON.parse(init.body)).toEqual({
      name: 'Deals',
      folder: {},
      '@microsoft.graph.conflictBehavior': 'fail',
    });
  });

  it('rename PATCHes the name and nothing else', async () => {
    const fetchMock = stubGraph({}, newItem);
    await run('drive-item-rename', { 'drive-id': 'D1', 'item-id': 'f1', name: 'Final.docx' });
    const [url, init] = writes(fetchMock)[0];
    expect(url).toBe('https://graph.microsoft.com/v1.0/drives/D1/items/f1');
    expect(JSON.parse(init.body)).toEqual({ name: 'Final.docx' });
  });
});

describe('drive-item-move / drive-item-copy stay inside one drive', () => {
  it('moves within the drive', async () => {
    const fetchMock = stubGraph({ f1: file('f1'), dest: folder('dest') }, newItem);
    await run('drive-item-move', { 'item-id': 'f1', 'destination-folder-id': 'dest' });
    const [url, init] = writes(fetchMock)[0];
    expect(url).toBe('https://graph.microsoft.com/v1.0/me/drive/items/f1');
    expect(JSON.parse(init.body)).toEqual({ parentReference: { id: 'dest' } });
  });

  it('copies within the drive, failing on a name clash', async () => {
    const fetchMock = stubGraph(
      { f1: file('f1'), dest: folder('dest') },
      new Response(null, { status: 202 })
    );
    const { text } = await run('drive-item-copy', {
      'item-id': 'f1',
      'destination-folder-id': 'dest',
    });
    const [url, init] = writes(fetchMock)[0];
    expect(url).toBe(
      'https://graph.microsoft.com/v1.0/me/drive/items/f1/copy?@microsoft.graph.conflictBehavior=fail'
    );
    expect(JSON.parse(init.body)).toEqual({ parentReference: { driveId: 'D1', id: 'dest' } });
    expect(JSON.parse(text)).toMatchObject({ accepted: true });
  });

  it.each(['drive-item-move', 'drive-item-copy'])(
    '%s refuses a destination in another drive',
    async (tool) => {
      const fetchMock = stubGraph({ f1: file('f1', 'D1'), dest: folder('dest', 'D2') });
      const { result, text } = await run(tool, {
        'item-id': 'f1',
        'destination-folder-id': 'dest',
      });
      expect(result.isError).toBe(true);
      expect(text).toMatch(/same drive/);
      expect(writes(fetchMock)).toHaveLength(0);
    }
  );

  it.each(['drive-item-move', 'drive-item-copy'])(
    '%s refuses a destination that is a file',
    async (tool) => {
      const fetchMock = stubGraph({ f1: file('f1'), f2: file('f2') });
      const { result, text } = await run(tool, { 'item-id': 'f1', 'destination-folder-id': 'f2' });
      expect(result.isError).toBe(true);
      expect(text).toMatch(/not a folder/);
      expect(writes(fetchMock)).toHaveLength(0);
    }
  );

  it.each(['drive-item-move', 'drive-item-copy'])(
    '%s sends the checked destination id, not the caller alias "root"',
    async (tool) => {
      const fetchMock = stubGraph(
        {
          f1: file('f1'),
          root: { id: 'ROOT-ID', root: {}, folder: {}, parentReference: { driveId: 'D1' } },
        },
        new Response(null, { status: 202 })
      );
      await run(tool, { 'item-id': 'f1', 'destination-folder-id': 'root' });
      expect(JSON.parse(writes(fetchMock)[0][1].body).parentReference.id).toBe('ROOT-ID');
    }
  );

  it.each([
    [
      'a shortcut source',
      { ...file('f1'), remoteItem: { id: 'x', parentReference: { driveId: 'D2' } } },
      folder('dest'),
    ],
    ['a shortcut destination', file('f1'), { ...folder('dest'), remoteItem: { id: 'y' } }],
    [
      'the drive root as source',
      { id: 'f1', root: {}, folder: {}, parentReference: { driveId: 'D1' } },
      folder('dest'),
    ],
  ])('refuses %s', async (_label, source, destination) => {
    for (const tool of ['drive-item-move', 'drive-item-copy']) {
      const fetchMock = stubGraph({ f1: source, dest: destination });
      const { result } = await run(tool, { 'item-id': 'f1', 'destination-folder-id': 'dest' });
      expect(result.isError).toBe(true);
      expect(writes(fetchMock)).toHaveLength(0);
    }
  });
});

describe('drive-file-delete', () => {
  it('deletes a single file', async () => {
    const fetchMock = stubGraph({ f1: file('f1') }, new Response(null, { status: 204 }));
    const { text } = await run('drive-file-delete', { 'item-id': 'f1' });
    expect(writes(fetchMock).map(([, init]) => init.method)).toEqual(['DELETE']);
    expect(JSON.parse(text)).toEqual({ deleted: true, id: 'f1', name: 'f1.docx' });
  });

  it.each([
    ['a folder', folder('x')],
    [
      'a OneNote notebook',
      { id: 'x', name: 'Notes', package: { type: 'oneNote' }, parentReference: {} },
    ],
    ['the drive root', { id: 'x', name: 'root', root: {}, folder: {}, parentReference: {} }],
  ])('refuses %s without deleting', async (_label, item) => {
    const fetchMock = stubGraph({ x: item });
    const { result, text } = await run('drive-file-delete', { 'item-id': 'x' });
    expect(result.isError).toBe(true);
    expect(text).toMatch(/single files only/);
    expect(writes(fetchMock)).toHaveLength(0);
  });
});

describe('item gets expose what the write tools need', () => {
  it('drive-item-get returns driveId, parentId, and eTag', async () => {
    stubGraph({ f1: newItem });
    const { text } = await run('drive-item-get', { 'item-id': 'f1' });
    expect(JSON.parse(text)).toMatchObject({
      id: 'n1',
      driveId: 'D1',
      parentId: 'p1',
      eTag: '"{n1},1"',
    });
  });
});
