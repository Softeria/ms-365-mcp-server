import { describe, expect, it } from 'vitest';
import {
  assertNodeVersionSupportsDocumentConversion,
  convertBufferToMarkdown,
  execArgvForWorkerPath,
  MIN_NODE_MAJOR_FOR_DOCUMENT_CONVERSION,
  MIN_NODE_MINOR_FOR_DOCUMENT_CONVERSION,
  MIN_NODE_VERSION_FOR_DOCUMENT_CONVERSION,
  OfficeParserNotInstalledError,
  TooManyConcurrentConversionsError,
  UnsupportedNodeVersionError,
} from '../src/lib/document-conversion.js';
import { buildXlsxWithText } from './fixtures/build-xlsx.js';

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

    // Regression coverage for the "truncate before crossing the worker boundary" fix: the
    // truncated-PDF test above already proves the final RESULT is short, but a 45-byte PDF can
    // never produce a markdown output large enough to meaningfully stress the old
    // truncate-after-receipt code path. This uses a real, valid .xlsx (see
    // test/fixtures/build-xlsx.ts) whose single cell expands to ~138,000 characters of real
    // markdown - orders of magnitude past the default 20,000-character cap - through the full,
    // real, unmocked convertBufferToMarkdown -> worker -> officeparser pipeline end to end.
    // See test/document-conversion-worker.test.ts for the complementary test that observes the
    // postMessage boundary itself and proves truncation happens worker-side, before the clone.
    it('truncates a real large-output document (xlsx) end-to-end and reports its untruncated length', async () => {
      const bigText = 'The quick brown fox jumps over the lazy dog. '.repeat(3000);
      const xlsxBuffer = buildXlsxWithText(bigText);
      const result = await convertBufferToMarkdown(xlsxBuffer, {
        timeoutMs: 15_000,
        maxOutputChars: 100,
      });
      expect(result.markdown).toHaveLength(100);
      expect(result.truncated).toBe(true);
      expect(result.totalLength).toBeGreaterThan(100_000);
    }, 20_000);

    // Finding 2: bound concurrent conversions. Each real conversion below spawns a real worker
    // thread against MINIMAL_PDF (fast: ~50ms observed elsewhere in this file), but the test does
    // not depend on that speed - see the comment inline for why the assertion is deterministic
    // regardless of how quickly any individual conversion actually finishes.
    it('rejects conversions beyond MS365_MCP_MAX_CONCURRENT_CONVERSIONS while letting others through', async () => {
      const prevLimit = process.env.MS365_MCP_MAX_CONCURRENT_CONVERSIONS;
      process.env.MS365_MCP_MAX_CONCURRENT_CONVERSIONS = '2';
      try {
        // convertBufferToMarkdown is an async function whose concurrency check-and-increment
        // runs synchronously before its first `await` (the worker spawn) - so calling it 4 times
        // back-to-back in a synchronous .map(), rather than one at a time, guarantees all 4 have
        // already passed (or failed) that check before any of their workers reports back. That
        // makes the 2-succeed/2-reject split below deterministic, not a race against how fast
        // MINIMAL_PDF happens to parse.
        const calls = [0, 1, 2, 3].map(() =>
          convertBufferToMarkdown(MINIMAL_PDF, { timeoutMs: 15_000 })
        );
        const results = await Promise.allSettled(calls);

        const fulfilled = results.filter(
          (r): r is PromiseFulfilledResult<Awaited<(typeof calls)[number]>> =>
            r.status === 'fulfilled'
        );
        const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

        expect(fulfilled).toHaveLength(2);
        expect(rejected).toHaveLength(2);
        for (const r of rejected) {
          expect(r.reason).toBeInstanceOf(TooManyConcurrentConversionsError);
          expect((r.reason as Error).message).toBe(
            'Too many document conversions are already in progress (2); try again shortly.'
          );
        }
        for (const r of fulfilled) {
          expect(r.value.markdown).toContain('Hello from a test PDF');
        }
      } finally {
        if (prevLimit === undefined) delete process.env.MS365_MCP_MAX_CONCURRENT_CONVERSIONS;
        else process.env.MS365_MCP_MAX_CONCURRENT_CONVERSIONS = prevLimit;
      }
    }, 20_000);

    it('releases its concurrency slot after completion, so a later call can succeed once earlier ones finish', async () => {
      const prevLimit = process.env.MS365_MCP_MAX_CONCURRENT_CONVERSIONS;
      process.env.MS365_MCP_MAX_CONCURRENT_CONVERSIONS = '1';
      try {
        const first = await convertBufferToMarkdown(MINIMAL_PDF, { timeoutMs: 15_000 });
        expect(first.markdown).toContain('Hello from a test PDF');
        // The slot from the first call was released in its `finally` block before this awaited,
        // so a second call made only after the first resolves must succeed too, not be rejected
        // as if it were still concurrent with the first.
        const second = await convertBufferToMarkdown(MINIMAL_PDF, { timeoutMs: 15_000 });
        expect(second.markdown).toContain('Hello from a test PDF');
      } finally {
        if (prevLimit === undefined) delete process.env.MS365_MCP_MAX_CONCURRENT_CONVERSIONS;
        else process.env.MS365_MCP_MAX_CONCURRENT_CONVERSIONS = prevLimit;
      }
    }, 20_000);

    it('releases its concurrency slot even when the conversion fails (timeout), not just on success', async () => {
      const prevLimit = process.env.MS365_MCP_MAX_CONCURRENT_CONVERSIONS;
      process.env.MS365_MCP_MAX_CONCURRENT_CONVERSIONS = '1';
      try {
        await expect(convertBufferToMarkdown(MINIMAL_PDF, { timeoutMs: 1 })).rejects.toThrow(
          /exceeded the 1ms limit/
        );
        // If the failed call above had leaked its slot (skipped the `finally` decrement), this
        // would now incorrectly reject with TooManyConcurrentConversionsError instead of running.
        const after = await convertBufferToMarkdown(MINIMAL_PDF, { timeoutMs: 15_000 });
        expect(after.markdown).toContain('Hello from a test PDF');
      } finally {
        if (prevLimit === undefined) delete process.env.MS365_MCP_MAX_CONCURRENT_CONVERSIONS;
        else process.env.MS365_MCP_MAX_CONCURRENT_CONVERSIONS = prevLimit;
      }
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

describe('execArgvForWorkerPath', () => {
  // Regression coverage for a real code-review finding: Node's built-in TypeScript
  // type-stripping only became enabled by default in 22.18.0, but
  // assertNodeVersionSupportsDocumentConversion's floor is 22.13.0 (set by pdfjs-dist's own
  // engines requirement) - so on 22.13.0-22.17.x, loading the raw .ts worker fallback (used
  // whenever no compiled dist/ sibling exists yet - dev mode via tsx, or vitest running
  // directly against src/) failed outright without an explicit flag. Tested here as a pure
  // path -> flags mapping rather than by actually running on that exact Node range, the same
  // way assertNodeVersionSupportsDocumentConversion's own boundary is tested with explicit
  // version strings below instead of installing that exact Node version.
  it('requests --experimental-strip-types for a .ts worker path', () => {
    expect(execArgvForWorkerPath('/x/document-conversion-worker.ts')).toEqual([
      '--experimental-strip-types',
    ]);
  });

  it('requests no special flags for a compiled .js worker path', () => {
    expect(execArgvForWorkerPath('/x/document-conversion-worker.js')).toBeUndefined();
  });
});
