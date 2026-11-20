import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import GraphClient, { graphInnerErrorCodes } from '../src/graph-client.js';
import { registerGraphTools, UTILITY_TOOLS } from '../src/graph-tools.js';
import {
  ACCEPT_VALUE_ERROR,
  ACCEPT_VALUE_MAX_LENGTH,
  isAcceptValue,
} from '../src/lib/media-type.js';

const UNATTRIBUTED = 'application/vnd.microsoft.graph.transcript+text';
const TRANSCRIPT_PATH = '/me/onlineMeetings/m1/transcripts/t1/content';
const FALLBACK = { innerErrorCode: 'SpeakerAttributionNotAllowed', accept: UNATTRIBUTED };

function graphError(innerCode: string, message = 'Forbidden'): Response {
  return new Response(
    JSON.stringify({ error: { code: 'Forbidden', message, innerError: { code: innerCode } } }),
    { status: 403, headers: { 'content-type': 'application/json' } }
  );
}

function client(): GraphClient {
  return new GraphClient(
    { getToken: async () => 'fake-token' } as unknown as ConstructorParameters<
      typeof GraphClient
    >[0],
    { clientId: 'x', tenantId: 'common', cloudType: 'global' } as unknown as ConstructorParameters<
      typeof GraphClient
    >[1],
    'json'
  );
}

function stubFetch(...responses: Response[]) {
  const accepts: Array<string | undefined> = [];
  const fetchMock = vi.fn(async (_url: unknown, init?: Parameters<typeof fetch>[1]) => {
    accepts.push((init?.headers as Record<string, string> | undefined)?.['Accept']);
    const next = responses.shift();
    if (!next) throw new Error('unexpected extra fetch');
    return next;
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, accepts };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('graphInnerErrorCodes', () => {
  it('collects every nested innerError code, either spelling, and skips error.code', () => {
    expect(
      graphInnerErrorCodes(
        '{"error":{"code":"Forbidden","innerError":{"code":"SpeakerAttributionNotAllowed"}}}'
      )
    ).toEqual(['SpeakerAttributionNotAllowed']);
    expect(
      graphInnerErrorCodes(
        '{"error":{"code":"A","innererror":{"code":"B","innerError":{"code":"C"}}}}'
      )
    ).toEqual(['B', 'C']);
  });

  it('returns an empty list for non-JSON or code-less bodies', () => {
    expect(graphInnerErrorCodes('not json')).toEqual([]);
    expect(graphInnerErrorCodes('null')).toEqual([]);
    expect(graphInnerErrorCodes('{"error":{"code":"SpeakerAttributionNotAllowed"}}')).toEqual([]);
    expect(graphInnerErrorCodes('{"error":{"innerError":{"code":42}}}')).toEqual([]);
  });
});

describe('GraphClient acceptFallback', () => {
  it('retries once with the fallback Accept on the matching innerError.code', async () => {
    const { accepts } = stubFetch(
      graphError('SpeakerAttributionNotAllowed'),
      new Response('00:00:00.000 --> 00:00:05.000\nBonjour', {
        status: 200,
        headers: { 'content-type': UNATTRIBUTED },
      })
    );

    const result = (await client().makeRequest(TRANSCRIPT_PATH, {
      headers: { Accept: 'text/vtt' },
      rawResponse: true,
      acceptFallback: FALLBACK,
    })) as { rawResponse: string };

    expect(accepts).toEqual(['text/vtt', UNATTRIBUTED]);
    expect(result.rawResponse).toContain('Bonjour');
  });

  it('does not retry on another innerError.code', async () => {
    const { fetchMock } = stubFetch(graphError('GraphAccessToTranscriptsDisabled'));

    await expect(
      client().makeRequest(TRANSCRIPT_PATH, {
        headers: { Accept: 'text/vtt' },
        acceptFallback: FALLBACK,
      })
    ).rejects.toThrow(/GraphAccessToTranscriptsDisabled/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not branch on the message text alone', async () => {
    const { fetchMock } = stubFetch(graphError('Other', 'SpeakerAttributionNotAllowed in message'));

    await expect(
      client().makeRequest(TRANSCRIPT_PATH, {
        headers: { Accept: 'text/vtt' },
        acceptFallback: FALLBACK,
      })
    ).rejects.toThrow(/403/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries at most once and reports the second 403', async () => {
    const { fetchMock } = stubFetch(
      graphError('SpeakerAttributionNotAllowed'),
      graphError('GraphAccessToTranscriptsDisabled')
    );

    await expect(
      client().makeRequest(TRANSCRIPT_PATH, {
        headers: { Accept: 'text/vtt' },
        acceptFallback: FALLBACK,
      })
    ).rejects.toThrow(/GraphAccessToTranscriptsDisabled/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports a non-403 error from the retry', async () => {
    const { fetchMock } = stubFetch(
      graphError('SpeakerAttributionNotAllowed'),
      // 404, not 5xx: fetchWithResilience retries 5xx on its own, which is not under test here.
      new Response('gone', { status: 404 })
    );

    await expect(
      client().makeRequest(TRANSCRIPT_PATH, {
        headers: { Accept: 'text/vtt' },
        acceptFallback: FALLBACK,
      })
    ).rejects.toThrow(
      /404 .*after retrying with Accept: application\/vnd\.microsoft\.graph\.transcript\+text/
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry without an acceptFallback option', async () => {
    const { fetchMock } = stubFetch(graphError('SpeakerAttributionNotAllowed'));

    await expect(
      client().makeRequest(TRANSCRIPT_PATH, { headers: { Accept: 'text/vtt' } })
    ).rejects.toThrow(/SpeakerAttributionNotAllowed/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('transcript content wiring', () => {
  function setup() {
    const server = new McpServer({ name: 't', version: '1' });
    const calls: Array<[string, Record<string, unknown>]> = [];
    const graphClient = {
      graphRequest: vi.fn(async (path: string, opts: Record<string, unknown>) => {
        calls.push([path, opts]);
        return { content: [{ type: 'text', text: 'ok' }] };
      }),
    } as unknown as GraphClient;
    const handlers = new Map<string, (p: Record<string, unknown>) => Promise<unknown>>();
    vi.spyOn(server, 'registerTool').mockImplementation(((
      name: string,
      _cfg: unknown,
      h: never
    ) => {
      handlers.set(name, h);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- registerTool() has many overloads
    }) as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(server, 'tool').mockImplementation((() => {}) as any);
    registerGraphTools(server, graphClient, { orgMode: true });
    return { handlers, calls };
  }

  it('passes the fallback when the configured default Accept is used', async () => {
    const { handlers, calls } = setup();
    await handlers.get('get-meeting-transcript-content')!({
      onlineMeetingId: 'm1',
      callTranscriptId: 't1',
    });
    expect(calls[0][1].acceptFallback).toEqual(FALLBACK);
  });

  it('passes the fallback for an ad hoc call transcript too', async () => {
    const { handlers, calls } = setup();
    await handlers.get('get-adhoc-call-transcript-content')!({
      adhocCallId: 'c1',
      callTranscriptId: 't1',
    });
    expect(calls[0][0]).toContain('/adhocCalls/c1/transcripts/t1/content');
    expect(calls[0][1].acceptFallback).toEqual(FALLBACK);
  });

  it('keeps the fallback when the caller echoes the default Accept', async () => {
    const { handlers, calls } = setup();
    await handlers.get('get-meeting-transcript-content')!({
      onlineMeetingId: 'm1',
      callTranscriptId: 't1',
      Accept: 'text/vtt',
    });
    expect(calls[0][1].acceptFallback).toEqual(FALLBACK);
  });

  it('keeps the fallback when the echoed default differs only in case', async () => {
    const { handlers, calls } = setup();
    await handlers.get('get-meeting-transcript-content')!({
      onlineMeetingId: 'm1',
      callTranscriptId: 't1',
      Accept: 'Text/VTT',
    });
    expect(calls[0][1].acceptFallback).toEqual(FALLBACK);
  });

  it('honours a different explicit Accept and adds no fallback', async () => {
    const { handlers, calls } = setup();
    await handlers.get('get-meeting-transcript-content')!({
      onlineMeetingId: 'm1',
      callTranscriptId: 't1',
      Accept: UNATTRIBUTED,
    });
    expect(calls[0][1].headers).toMatchObject({ Accept: UNATTRIBUTED });
    expect(calls[0][1].acceptFallback).toBeUndefined();
  });

  it('adds no fallback when the caller forces $format, which Graph applies over Accept', async () => {
    const { handlers, calls } = setup();
    await handlers.get('get-meeting-transcript-content')!({
      onlineMeetingId: 'm1',
      callTranscriptId: 't1',
      format: 'text/vtt',
    });
    expect(calls[0][0]).toContain('$format=');
    expect(calls[0][1].acceptFallback).toBeUndefined();
  });

  it('treats an empty Accept as unset: default and fallback apply', async () => {
    const { handlers, calls } = setup();
    await handlers.get('get-meeting-transcript-content')!({
      onlineMeetingId: 'm1',
      callTranscriptId: 't1',
      Accept: '',
    });
    expect(calls[0][1].headers).toMatchObject({ Accept: 'text/vtt' });
    expect(calls[0][1].acceptFallback).toEqual(FALLBACK);
  });

  it('forwards wildcards and parameters unchanged', async () => {
    const { handlers, calls } = setup();
    await handlers.get('get-meeting-transcript-content')!({
      onlineMeetingId: 'm1',
      callTranscriptId: 't1',
      Accept: 'text/plain; charset=utf-8, */*',
    });
    expect(calls[0][1].headers).toMatchObject({ Accept: 'text/plain; charset=utf-8, */*' });
  });

  it('rejects an Accept that could inject a header', async () => {
    const { handlers, calls } = setup();
    const result = (await handlers.get('get-meeting-transcript-content')!({
      onlineMeetingId: 'm1',
      callTranscriptId: 't1',
      Accept: 'text/vtt\r\nX-Evil: 1',
    })) as { isError?: boolean };
    expect(result.isError).toBe(true);
    expect(calls).toHaveLength(0);
  });
});

describe('download-bytes accept', () => {
  const tool = UTILITY_TOOLS.find((t) => t.name === 'download-bytes')!;

  function graphClientSpy() {
    const graphRequest = vi.fn(async () => ({ content: [{ type: 'text', text: 'ok' }] }));
    return { graphRequest, graphClient: { graphRequest } as unknown as GraphClient };
  }

  it('forwards a valid media type as the Accept header', async () => {
    const { graphRequest, graphClient } = graphClientSpy();
    await tool.execute({ target: TRANSCRIPT_PATH, accept: UNATTRIBUTED }, {
      graphClient,
    } as Parameters<typeof tool.execute>[1]);
    expect(graphRequest).toHaveBeenCalledWith(
      TRANSCRIPT_PATH,
      expect.objectContaining({ headers: { Accept: UNATTRIBUTED } })
    );
  });

  it('treats a null accept as unset', async () => {
    const { graphRequest, graphClient } = graphClientSpy();
    const result = (await tool.execute({ target: '/me/photo/$value', accept: null }, {
      graphClient,
    } as Parameters<typeof tool.execute>[1])) as { isError?: boolean };
    expect(result.isError).toBeUndefined();
    const opts = (graphRequest.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(opts.headers).toBeUndefined();
  });

  it('sends no Accept header when accept is unset', async () => {
    const { graphRequest, graphClient } = graphClientSpy();
    await tool.execute({ target: '/me/photo/$value' }, { graphClient } as Parameters<
      typeof tool.execute
    >[1]);
    const opts = (graphRequest.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(opts.headers).toBeUndefined();
  });

  it('rejects a value that could inject a header', async () => {
    const { graphRequest, graphClient } = graphClientSpy();
    const result = (await tool.execute(
      { target: TRANSCRIPT_PATH, accept: 'text/vtt\r\nX-Evil: 1' },
      { graphClient } as Parameters<typeof tool.execute>[1]
    )) as { isError?: boolean };
    expect(result.isError).toBe(true);
    expect(graphRequest).not.toHaveBeenCalled();
  });

  it('declares accept in its schema with the same media-type rule', () => {
    const schema = tool.buildSchema({
      graphClient: {} as GraphClient,
      multiAccount: false,
      accountNames: [],
    });
    expect(schema.accept.safeParse(undefined).success).toBe(true);
    expect(schema.accept.safeParse(UNATTRIBUTED).success).toBe(true);
    expect(schema.accept.safeParse('text/vtt\r\nX-Evil: 1').success).toBe(false);
  });

  it('isAcceptValue accepts printable header values and nothing else', () => {
    expect(isAcceptValue('text/vtt')).toBe(true);
    expect(isAcceptValue(UNATTRIBUTED)).toBe(true);
    expect(isAcceptValue('*/*')).toBe(true);
    expect(isAcceptValue('text/plain; charset=utf-8, */*')).toBe(true);
    expect(isAcceptValue('')).toBe(true); // empty means unset to every caller
    expect(isAcceptValue('text/vtt\r\nX-Evil: 1')).toBe(false);
    expect(isAcceptValue('text/vtt\u0000')).toBe(false);
    expect(isAcceptValue(' text/vtt')).toBe(false);
    expect(isAcceptValue('t/' + 'v'.repeat(260))).toBe(false);
    expect(ACCEPT_VALUE_ERROR).toContain(String(ACCEPT_VALUE_MAX_LENGTH));
  });
});

describe('download-bytes-to-file accept', () => {
  const tool = UTILITY_TOOLS.find((t) => t.name === 'download-bytes-to-file')!;
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function setup() {
    dir = await mkdtemp(path.join(os.tmpdir(), 'accept-dl-'));
    const downloadToFile = vi.fn(async () => ({ contentType: UNATTRIBUTED, contentLength: 3 }));
    return { downloadToFile, graphClient: { downloadToFile } as unknown as GraphClient };
  }

  it('forwards a valid media type as the Accept header', async () => {
    const { downloadToFile, graphClient } = await setup();
    await tool.execute(
      { target: TRANSCRIPT_PATH, outputPath: path.join(dir, 't.txt'), accept: UNATTRIBUTED },
      { graphClient } as Parameters<typeof tool.execute>[1]
    );
    expect(downloadToFile).toHaveBeenCalledWith(
      TRANSCRIPT_PATH,
      expect.any(String),
      expect.objectContaining({ headers: { Accept: UNATTRIBUTED } })
    );
  });

  it('rejects an invalid accept before calling Graph', async () => {
    const { downloadToFile, graphClient } = await setup();
    const result = (await tool.execute(
      { target: TRANSCRIPT_PATH, outputPath: path.join(dir, 't.txt'), accept: 'a/b\nX: 1' },
      { graphClient } as Parameters<typeof tool.execute>[1]
    )) as { isError?: boolean };
    expect(result.isError).toBe(true);
    expect(downloadToFile).not.toHaveBeenCalled();
  });
});
