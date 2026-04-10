import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_MAX_CHARS,
  extractTextBuiltin,
  extractTextExternal,
  getExternalExtractionConfigFromEnv,
  truncateText,
} from '../src/lib/text-extraction.ts';

describe('text-extraction', () => {
  it('truncateText respects maxChars', () => {
    expect(truncateText('hello', 10)).toEqual({ text: 'hello', truncated: false });
    expect(truncateText('abcdefghij', 5)).toEqual({ text: 'abcde', truncated: true });
  });

  it('extractTextBuiltin handles utf-8 text', async () => {
    const buf = new TextEncoder().encode('Hello 世界');
    const { text, extractor } = await extractTextBuiltin(buf, 'text/plain', 'note.txt');
    expect(extractor).toBe('builtin-text');
    expect(text).toBe('Hello 世界');
  });

  it('extractTextBuiltin rejects unknown binary types', async () => {
    const buf = new Uint8Array([0xff, 0xd8, 0xff]);
    await expect(extractTextBuiltin(buf, 'application/octet-stream', 'photo.jpg')).rejects.toThrow(
      /No built-in extractor/
    );
  });

  it('DEFAULT_MAX_CHARS is reasonable for MCP responses', () => {
    expect(DEFAULT_MAX_CHARS).toBeGreaterThan(10_000);
  });
});

describe('getExternalExtractionConfigFromEnv', () => {
  const keys = [
    'TEXT_EXTRACTION_URL',
    'TEXT_EXTRACTION_API_KEY',
    'TEXT_EXTRACTION_FORMAT',
    'TEXT_EXTRACTION_MULTIPART_FIELD',
  ] as const;

  afterEach(() => {
    for (const k of keys) delete process.env[k];
  });

  it('returns null when URL unset', () => {
    expect(getExternalExtractionConfigFromEnv()).toBeNull();
  });

  it('defaults to json and file field', () => {
    process.env.TEXT_EXTRACTION_URL = 'http://example.com/extract';
    const c = getExternalExtractionConfigFromEnv();
    expect(c).toMatchObject({
      url: 'http://example.com/extract',
      format: 'json',
      multipartFieldName: 'file',
    });
  });

  it('accepts multipart and custom field name', () => {
    process.env.TEXT_EXTRACTION_URL = 'http://gw/text-extraction/extract';
    process.env.TEXT_EXTRACTION_FORMAT = 'multipart';
    process.env.TEXT_EXTRACTION_MULTIPART_FIELD = 'document';
    const c = getExternalExtractionConfigFromEnv();
    expect(c).toMatchObject({
      format: 'multipart',
      multipartFieldName: 'document',
    });
  });
});

describe('extractTextExternal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs JSON with Content-Type application/json', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'ok' }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const { text, extractor } = await extractTextExternal(
      new Uint8Array([65, 66]),
      'text/plain',
      't.txt',
      {
        url: 'http://api/x',
        format: 'json',
        multipartFieldName: 'file',
      }
    );

    expect(text).toBe('ok');
    expect(extractor).toBe('external');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as NonNullable<Parameters<typeof globalThis.fetch>[1]>;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(typeof init.body).toBe('string');
    expect(JSON.parse(init.body as string)).toMatchObject({
      mimeType: 'text/plain',
      fileName: 't.txt',
    });
  });

  it('POSTs multipart FormData without setting Content-Type', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ extracted_text: 'from-gateway' }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const { text } = await extractTextExternal(new Uint8Array([1]), 'application/pdf', 'a.pdf', {
      url: 'http://gw/text-extraction/extract',
      format: 'multipart',
      multipartFieldName: 'file',
    });

    expect(text).toBe('from-gateway');
    const init = fetchMock.mock.calls[0][1] as NonNullable<Parameters<typeof globalThis.fetch>[1]>;
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });
});
