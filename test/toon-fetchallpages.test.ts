/**
 * Regression for #19 — fetchAllPages must never silently return only page 1.
 * In TOON output mode the response text is not JSON, so the page merge cannot
 * run; before this fix executeTool swallowed the JSON.parse error and returned
 * the single first page with isError:false. These tests drive executeTool with
 * a mocked GraphClient exposing a `format` getter and per-page `graphRequest`
 * text, asserting an explicit error in TOON mode (and on merge failure) while
 * preserving the JSON multi-page merge.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GraphClient from '../src/graph-client.js';
import { executeTool } from '../src/tool-runtime.js';
import { ALL_TOOLS, type Tool } from '../src/tools/index.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const findTool = (name: string) => ALL_TOOLS.find((t) => t.name === name) as Tool;

/** Build a mock GraphClient with a `format` getter and a graphRequest that
 * returns the supplied page texts in order (last text repeats if exhausted). */
function makeGraphClient(format: 'json' | 'toon', pageTexts: string[]): GraphClient {
  let call = 0;
  const graphRequest = vi.fn().mockImplementation(() => {
    const text = pageTexts[Math.min(call, pageTexts.length - 1)];
    call++;
    return Promise.resolve({ content: [{ type: 'text', text }], isError: false });
  });
  return { format, graphRequest } as unknown as GraphClient;
}

beforeEach(() => vi.clearAllMocks());

describe('fetchAllPages output-format safety (#19)', () => {
  it('refuses fetchAllPages in TOON mode instead of returning a silent partial', async () => {
    // A single TOON page that still advertises more pages via @odata.nextLink.
    const toonPage = 'value[1]{id,subject}:\n  1,Hello\n@odata.nextLink: https://x/next';
    const gc = makeGraphClient('toon', [toonPage]);

    // An unshaped list tool: these tests pin the generic page merge, not a tool's shape.
    const result = await executeTool(findTool('mail-folder-list'), gc, { fetchAllPages: true });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/TOON/);
    expect(result.content[0].text).toMatch(/not supported/i);
    // Must not follow the nextLink: exactly one request was made.
    expect((gc.graphRequest as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it('merges all pages in JSON mode (regression — behavior preserved)', async () => {
    const page1 = JSON.stringify({
      '@odata.count': 4,
      '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=2',
      value: [{ id: '1' }, { id: '2' }],
    });
    const page2 = JSON.stringify({ value: [{ id: '3' }, { id: '4' }] });
    const gc = makeGraphClient('json', [page1, page2]);

    const result = await executeTool(findTool('mail-folder-list'), gc, { fetchAllPages: true });

    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body.value).toHaveLength(4);
    expect(body['@odata.nextLink']).toBeUndefined();
    expect((gc.graphRequest as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
  });

  it('errors instead of returning a silent partial when a later page is not JSON', async () => {
    const page1 = JSON.stringify({
      '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=2',
      value: [{ id: '1' }],
    });
    const badPage2 = 'value[1]{id}:\n  2'; // TOON-ish, not JSON — JSON.parse throws
    const gc = makeGraphClient('json', [page1, badPage2]);

    const result = await executeTool(findTool('mail-folder-list'), gc, { fetchAllPages: true });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/incomplete|merge/i);
  });

  it('leaves a single TOON page untouched when fetchAllPages is not requested', async () => {
    const toonPage = 'value[1]{id,subject}:\n  1,Hello';
    const gc = makeGraphClient('toon', [toonPage]);

    const result = await executeTool(findTool('mail-folder-list'), gc, {});

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toBe(toonPage);
  });
});
