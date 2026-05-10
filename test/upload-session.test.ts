/**
 * Tests for UploadSessionHelper (Plan 02-06 / MWARE-05).
 *
 * Closes MWARE-05 (resumable upload) per D-08. UploadSession stands OUTSIDE
 * the standard middleware chain for chunk PUTs (would double-retry otherwise).
 * Session creation POST goes through the FULL chain.
 *
 * Contract coverage:
 *   1. alignChunkSize rounds DOWN to 320 KiB multiple; clamps to 60 MiB.
 *   2. parseNextExpectedRanges handles both closed (`12345-55232`) and
 *      open-ended (`77829-`) range forms.
 *   3. Chunk PUT requests do NOT include Authorization header (T-02-06d —
 *      uploadUrl is pre-authenticated; adding Auth returns 401).
 *   4. Resume after 5xx — helper GETs the session URL for
 *      nextExpectedRanges, parses, and resumes from the reported offset.
 *   5. 416 recovery — same resume protocol; on 416 the server already has
 *      the range, helper re-fetches authoritative offset.
 *
 * Logger is mocked so the test suite does not depend on pino bootstrap.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('alignChunkSize + parseNextExpectedRanges (pure helpers)', () => {
  it('alignChunkSize rounds DOWN to 320 KiB multiple; clamps to 60 MiB', async () => {
    const { alignChunkSize } = await import('../src/lib/upload-session.js');
    expect(alignChunkSize(500_000)).toBe(327_680); // floor(500000 / 327680) * 327680
    expect(alignChunkSize(3_276_800)).toBe(3_276_800); // exact multiple
    expect(alignChunkSize(100_000_000)).toBe(62_914_560); // clamp then align
    expect(alignChunkSize(0)).toBe(327_680); // minimum = 1 alignment unit
  });

  it('parseNextExpectedRanges handles open-ended and closed forms', async () => {
    const { parseNextExpectedRanges } = await import('../src/lib/upload-session.js');
    expect(parseNextExpectedRanges(['12345-55232', '77829-'])).toEqual([
      { start: 12345, end: 55232 },
      { start: 77829 },
    ]);
  });
});

describe('UploadSessionHelper.uploadLargeFile', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /**
   * Build a mock GraphClient whose graphRequest resolves with a canned
   * createUploadSession envelope (uploadUrl + expirationDateTime). The chunk
   * PUTs go directly through the stubbed global fetch.
   */
  interface MockGraphClient {
    graphRequest: ReturnType<typeof vi.fn>;
  }

  function mockGraphClient(sessionUrl: string): MockGraphClient {
    return {
      graphRequest: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              uploadUrl: sessionUrl,
              expirationDateTime: new Date(Date.now() + 3_600_000).toISOString(),
            }),
          },
        ],
      }),
    };
  }

  it('chunk PUTs do NOT include Authorization header (pre-authenticated uploadUrl — T-02-06d)', async () => {
    const { UploadSessionHelper } = await import('../src/lib/upload-session.js');
    const sessionUrl = 'https://graphplaceholder.example/upload/abc123';
    const gc = mockGraphClient(sessionUrl);
    const buffer = Buffer.alloc(327_680 * 2); // 640 KiB → 2 chunks at 320 KiB
    // Chunk 1: 202 intermediate; Chunk 2: 201 with DriveItem
    fetchSpy.mockResolvedValueOnce(
      new Response('{"nextExpectedRanges":["327680-"]}', {
        status: 202,
        headers: { 'content-type': 'application/json' },
      })
    );
    fetchSpy.mockResolvedValueOnce(
      new Response('{"id":"drv1","name":"f.bin"}', {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    );

    const helper = new UploadSessionHelper(gc);
    const result = await helper.uploadLargeFile('/me/drive/root:/f.bin', buffer, {
      chunkSize: 327_680,
    });
    expect(result.id).toBe('drv1');

    // Inspect each fetch call; NONE should carry an Authorization header
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    for (const call of fetchSpy.mock.calls) {
      const init = call[1] as { headers?: Record<string, string> };
      const hdrs = init.headers;
      if (hdrs) {
        const hasAuth = Object.keys(hdrs).some((k) => k.toLowerCase() === 'authorization');
        expect(hasAuth).toBe(false);
      }
    }
  });

  it('resumes after 5xx: GET session URL → nextExpectedRanges → retry chunk → 201', async () => {
    const { UploadSessionHelper } = await import('../src/lib/upload-session.js');
    const sessionUrl = 'https://graphplaceholder.example/upload/xyz';
    const gc = mockGraphClient(sessionUrl);
    const buffer = Buffer.alloc(327_680 * 2);
    // Sequence:
    //   1. PUT chunk 1 → 500
    //   2. GET session → { nextExpectedRanges: ['0-'] } (start over)
    //   3. PUT chunk 1 → 202
    //   4. PUT chunk 2 → 201 DriveItem
    fetchSpy.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    fetchSpy.mockResolvedValueOnce(
      new Response('{"nextExpectedRanges":["0-"]}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    fetchSpy.mockResolvedValueOnce(
      new Response('{"nextExpectedRanges":["327680-"]}', {
        status: 202,
        headers: { 'content-type': 'application/json' },
      })
    );
    fetchSpy.mockResolvedValueOnce(
      new Response('{"id":"drv2","name":"x.bin"}', {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    );

    const helper = new UploadSessionHelper(gc);
    const result = await helper.uploadLargeFile('/me/drive/root:/x.bin', buffer, {
      chunkSize: 327_680,
    });
    expect(result.id).toBe('drv2');
  });

  it('416 recovery: GET session URL, resume from reported offset', async () => {
    const { UploadSessionHelper } = await import('../src/lib/upload-session.js');
    const sessionUrl = 'https://graphplaceholder.example/upload/mnb';
    const gc = mockGraphClient(sessionUrl);
    const buffer = Buffer.alloc(327_680 * 2);
    // Sequence:
    //   1. PUT chunk 1 (offset 0) → 202 nextExpectedRanges ['327680-']
    //   2. PUT chunk 2 (offset 327680) → 416
    //   3. GET session → { nextExpectedRanges: ['655360-'] } (server already has chunk 2)
    //   4. Per Graph docs Example 6: GET session when upload is complete may return
    //      200 with the DriveItem body. We simulate that here.
    fetchSpy.mockResolvedValueOnce(
      new Response('{"nextExpectedRanges":["327680-"]}', {
        status: 202,
        headers: { 'content-type': 'application/json' },
      })
    );
    fetchSpy.mockResolvedValueOnce(new Response('{}', { status: 416 }));
    fetchSpy.mockResolvedValueOnce(
      new Response('{"nextExpectedRanges":["655360-"]}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    // Offset has advanced to totalBytes; helper fetches session status one more
    // time to commit — a final GET returning the DriveItem envelope satisfies
    // the "recovered from status" branch.
    fetchSpy.mockResolvedValueOnce(
      new Response('{"id":"drv416","name":"y.bin"}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const helper = new UploadSessionHelper(gc);
    const result = await helper.uploadLargeFile('/me/drive/root:/y.bin', buffer, {
      chunkSize: 327_680,
    });
    expect(result.id).toBe('drv416');
  });
});
