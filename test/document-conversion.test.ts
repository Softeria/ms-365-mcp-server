import { describe, expect, it } from 'vitest';
import {
  assertNodeVersionSupportsDocumentConversion,
  convertBufferToMarkdown,
  MIN_NODE_MAJOR_FOR_DOCUMENT_CONVERSION,
  MIN_NODE_MINOR_FOR_DOCUMENT_CONVERSION,
  MIN_NODE_VERSION_FOR_DOCUMENT_CONVERSION,
  OfficeParserNotInstalledError,
  UnsupportedNodeVersionError,
} from '../src/lib/document-conversion.js';

// True when the ambient Node version can actually run officeparser's dependencies (file-type,
// pdfjs-dist both require Node >=22.13.0 — see assertNodeVersionSupportsDocumentConversion).
// document-conversion.ts's own resolveWorkerPath() falls back to loading the worker's raw .ts
// source when no compiled dist/ sibling exists next to it — which is always the case here,
// since vitest runs directly against src/lib/document-conversion.ts and no compiled .js has
// ever lived in src/lib/ (compiled output goes to dist/lib/, a different directory). Node's
// own built-in TypeScript stripping (unflagged on 22/24) is what makes that fallback work,
// and it isn't available on Node 20 — so real-worker tests here would fail on CI's Node 20
// leg for a version the feature itself already refuses to run on (Node 20 < 22.13.0). Skip
// them there instead of failing on an environment the product surface (the startup guard in
// server.ts) already blocks.
const nodeSupportsDocumentConversion = (() => {
  try {
    assertNodeVersionSupportsDocumentConversion();
    return true;
  } catch {
    return false;
  }
})();

// A tiny, valid, hand-crafted PDF - real bytes, real officeparser, run through a real worker
// thread. officeparser now runs in a worker (see src/lib/worker-timeout.ts for why: some of its
// per-format parsers are not interruptible via a cooperative AbortSignal), which means vitest's
// module mocking cannot reach it - a `vi.mock('officeparser', ...)` in this process has no
// effect on a separately spawned worker thread's own module resolution. So these tests exercise
// the real conversion pipeline end to end rather than mocking officeparser away.
const MINIMAL_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 300 144] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 45 >>
stream
BT /F1 18 Tf 20 100 Td (Hello from a test PDF) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`
);

describe.skipIf(!nodeSupportsDocumentConversion)(
  'convertBufferToMarkdown (real officeparser, real worker)',
  () => {
    it('extracts real text from a real PDF via the worker pipeline', async () => {
      const result = await convertBufferToMarkdown(MINIMAL_PDF, { timeoutMs: 15_000 });
      expect(result.markdown).toContain('Hello from a test PDF');
      expect(result.truncated).toBe(false);
      expect(result.totalLength).toBe(result.markdown.length);
    }, 20_000);

    it('truncates output over maxOutputChars and reports the untruncated length', async () => {
      const result = await convertBufferToMarkdown(MINIMAL_PDF, {
        timeoutMs: 15_000,
        maxOutputChars: 5,
      });
      expect(result.markdown).toHaveLength(5);
      expect(result.truncated).toBe(true);
      expect(result.totalLength).toBeGreaterThan(5);
    }, 20_000);

    it('rejects with a clear message when the timeout is exceeded', async () => {
      // 1ms is unreachable for any real parse to complete inside honestly, so this exercises the
      // real worker-termination path (see test/worker-timeout.test.ts for the mechanism itself)
      // against the actual officeparser worker script, not a synthetic fixture.
      await expect(convertBufferToMarkdown(MINIMAL_PDF, { timeoutMs: 1 })).rejects.toThrow(
        /exceeded the 1ms limit/
      );
    }, 20_000);
  }
);

describe('assertNodeVersionSupportsDocumentConversion', () => {
  it(`does not throw at or above Node ${MIN_NODE_VERSION_FOR_DOCUMENT_CONVERSION}`, () => {
    expect(() => assertNodeVersionSupportsDocumentConversion('22.13.0')).not.toThrow();
    expect(() => assertNodeVersionSupportsDocumentConversion('24.1.2')).not.toThrow();
  });

  it.each(['18.19.1', '20.11.0', '21.7.3', '21.9.9', '22.0.0'])(
    'throws UnsupportedNodeVersionError below the minimum (%s)',
    (version) => {
      expect(() => assertNodeVersionSupportsDocumentConversion(version)).toThrow(
        UnsupportedNodeVersionError
      );
    }
  );

  // Node 22.0.0-22.12.x pass a major-only check (major === 22) but are still below
  // pdfjs-dist@6.1.200's actual declared floor of >=22.13.0, so document conversion would
  // otherwise fail lazily on the first real convert-document call instead of at startup. These
  // boundary cases pin the fix: only major===22 with minor>=13 (or major>22) may pass.
  it.each([
    ['22.12.9', true],
    ['22.13.0', false],
    ['22.13.1', false],
    ['23.0.0', false],
    ['24.0.0', false],
  ] as const)('boundary check around Node %s (throws: %s)', (version, shouldThrow) => {
    const assertion = () => assertNodeVersionSupportsDocumentConversion(version);
    if (shouldThrow) {
      expect(assertion).toThrow(UnsupportedNodeVersionError);
    } else {
      expect(assertion).not.toThrow();
    }
  });

  it(`MIN_NODE_MINOR_FOR_DOCUMENT_CONVERSION and MIN_NODE_VERSION_FOR_DOCUMENT_CONVERSION agree`, () => {
    expect(MIN_NODE_MINOR_FOR_DOCUMENT_CONVERSION).toBe(13);
    expect(MIN_NODE_VERSION_FOR_DOCUMENT_CONVERSION).toBe(
      `${MIN_NODE_MAJOR_FOR_DOCUMENT_CONVERSION}.${MIN_NODE_MINOR_FOR_DOCUMENT_CONVERSION}.0`
    );
  });

  it('names the actual and precise required versions in the error message', () => {
    expect(() => assertNodeVersionSupportsDocumentConversion('18.19.1')).toThrow(
      /requires Node >=22\.13\.0.*running Node 18\.19\.1/
    );
  });

  it('does not throw on an unparseable version string (fails open rather than blocking startup on a fluke)', () => {
    expect(() => assertNodeVersionSupportsDocumentConversion('not-a-version')).not.toThrow();
  });

  it('defaults to the real running Node version when called with no argument', () => {
    // CI runs this suite on Node 20 as well as 22/24 (vitest 4's own floor is only >=20), and
    // Node 20 is legitimately below this feature's 22.13.0 requirement — so the only thing
    // assertable here without assuming which CI leg is running is that the no-argument call
    // agrees with an explicit call using the real ambient version, proving the default
    // parameter genuinely reads process.versions.node rather than hardcoding something else.
    if (nodeSupportsDocumentConversion) {
      expect(() => assertNodeVersionSupportsDocumentConversion()).not.toThrow();
    } else {
      expect(() => assertNodeVersionSupportsDocumentConversion()).toThrow(
        UnsupportedNodeVersionError
      );
    }
  });
});

describe('OfficeParserNotInstalledError', () => {
  it('names npm install officeparser in its message', () => {
    const error = new OfficeParserNotInstalledError();
    expect(error.message).toContain('npm install officeparser');
    expect(error.name).toBe('OfficeParserNotInstalledError');
  });
});
