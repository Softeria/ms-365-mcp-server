import { afterEach, describe, expect, it, vi } from 'vitest';

const parseOfficeMock = vi.fn();

vi.mock('officeparser', () => ({
  parseOffice: (...args: unknown[]) => parseOfficeMock(...args),
}));

// Imported after the mock so the module under test picks up the mocked officeparser.
const { convertBufferToMarkdown } = await import('../src/lib/document-conversion.js');

function astReturning(markdown: string) {
  return { to: vi.fn().mockResolvedValue({ value: markdown, messages: [] }) };
}

describe('convertBufferToMarkdown', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the converted markdown untruncated when it fits', async () => {
    parseOfficeMock.mockResolvedValue(astReturning('# Quote\n\n$3,590.00'));
    const result = await convertBufferToMarkdown(Buffer.from('fake pdf bytes'));
    expect(result).toEqual({
      markdown: '# Quote\n\n$3,590.00',
      truncated: false,
      totalLength: '# Quote\n\n$3,590.00'.length,
    });
  });

  it('truncates output over maxOutputChars and reports the real total length', async () => {
    const long = 'x'.repeat(100);
    parseOfficeMock.mockResolvedValue(astReturning(long));
    const result = await convertBufferToMarkdown(Buffer.from('fake'), { maxOutputChars: 10 });
    expect(result.markdown).toBe('x'.repeat(10));
    expect(result.truncated).toBe(true);
    expect(result.totalLength).toBe(100);
  });

  it('passes ocr through to parseOffice, off by default', async () => {
    parseOfficeMock.mockResolvedValue(astReturning('text'));
    await convertBufferToMarkdown(Buffer.from('fake'));
    expect(parseOfficeMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ocr: false })
    );

    await convertBufferToMarkdown(Buffer.from('fake'), { ocr: true });
    expect(parseOfficeMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ ocr: true })
    );
  });

  it('passes an AbortSignal to parseOffice for the timeout', async () => {
    parseOfficeMock.mockResolvedValue(astReturning('text'));
    await convertBufferToMarkdown(Buffer.from('fake'));
    const config = parseOfficeMock.mock.calls[0][1];
    expect(config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('reports a clear, non-crashing error when parseOffice rejects', async () => {
    parseOfficeMock.mockRejectedValue(new Error('corrupt PDF: unexpected EOF'));
    await expect(convertBufferToMarkdown(Buffer.from('fake'))).rejects.toThrow(
      'corrupt PDF: unexpected EOF'
    );
  });

  it('turns an aborted parse into a message naming the timeout, not a raw AbortError', async () => {
    parseOfficeMock.mockImplementation(() => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    await expect(convertBufferToMarkdown(Buffer.from('fake'), { timeoutMs: 5 })).rejects.toThrow(
      /5ms limit/
    );
  });

  it('throws OfficeParserNotInstalledError with actionable guidance when the module is missing', async () => {
    vi.doMock('officeparser', () => {
      throw new Error("Cannot find module 'officeparser'");
    });
    vi.resetModules();
    // Re-import the error class from the same fresh module instance as convertWithMissingDep —
    // resetModules gives every import() a new module registry, so the OfficeParserNotInstalledError
    // captured at the top of this file is a *different* class object from the one actually thrown
    // here, and instanceof across that boundary always fails.
    const {
      convertBufferToMarkdown: convertWithMissingDep,
      OfficeParserNotInstalledError: FreshOfficeParserNotInstalledError,
    } = await import('../src/lib/document-conversion.js');
    await expect(convertWithMissingDep(Buffer.from('fake'))).rejects.toThrow(
      FreshOfficeParserNotInstalledError
    );
    await expect(convertWithMissingDep(Buffer.from('fake'))).rejects.toThrow(
      'npm install officeparser'
    );
    vi.doUnmock('officeparser');
    vi.resetModules();
  });
});
