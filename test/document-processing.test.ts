import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { once } from 'node:events';
import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { expect, it, vi } from 'vitest';
import { createAttachmentHandler } from '../src/attachment-route.js';
import { registerGraphTools } from '../src/graph-tools.js';
import {
  configureAttachmentMinting,
  resetAttachmentMinting,
} from '../src/lib/attachment-minting.js';
import { AttachmentTicketStore } from '../src/lib/attachment-tickets.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function json(result: { content?: unknown }): Record<string, unknown> {
  return JSON.parse((result.content as { text: string }[])[0].text);
}

it('keeps native processor continuation and coverage through real single-use URL fetches', async () => {
  const target = '/me/messages/example-message/attachments/example-attachment/$value';
  const account = 'example-account';
  const token = 'synthetic-account-token';
  const source = 'A😀B\nCDE\n';
  let sourceText = source;
  // These are coverage fixtures, not claims that the text reader performs OCR.
  let coverage: Record<string, unknown> | undefined = { selected_pages: [2], source_pages: 3 };
  const auth = {
    isOAuthModeEnabled: () => false,
    getTokenForAccount: vi.fn(async (_account: string | undefined) => token),
  };
  const graph = {
    makeRequest: vi.fn(async (_target: string, _options: { accessToken: string }) => ({
      name: 'example.txt',
      contentType: 'text/plain',
    })),
    downloadStream: vi.fn(async (_target: string, _options: { accessToken: string }) => {
      const bytes = new TextEncoder().encode(sourceText);
      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
        contentType: 'text/plain',
        contentLength: bytes.byteLength,
        contentDisposition: null,
      };
    }),
  };
  const store = new AttachmentTicketStore(120);
  const app = express();
  app.get(
    '/attachment',
    createAttachmentHandler({
      store,
      getGraphClient: () => graph as never,
      authManager: auth as never,
    })
  );
  const http = createServer(app);
  const m365 = new McpServer({ name: 'synthetic-m365', version: '1' });
  const excerpts = new McpServer({ name: 'synthetic-excerpts', version: '1' });
  const sections = new McpServer({ name: 'synthetic-sections', version: '1' });
  const clients: Client[] = [];
  async function connect(server: McpServer) {
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'reference-client', version: '1' });
    clients.push(client);
    await server.connect(a);
    await client.connect(b);
    return client;
  }
  const excerptCalls: { from: number; pages: string }[] = [];
  const sectionCalls: { bookmark: string | undefined; section: string }[] = [];
  const bookmark = 'opaque:second-part?revision=example-v1';

  try {
    http.listen(0, '127.0.0.1');
    await once(http, 'listening');
    configureAttachmentMinting({
      store,
      config: {
        base: `http://127.0.0.1:${(http.address() as AddressInfo).port}`,
        keyId: '1',
        ttlSeconds: 120,
      },
    });
    registerGraphTools(m365, graph as never, {
      authManager: auth as never,
      multiAccount: true,
      accountNames: [account],
      enabledTools: '^get-download-url$',
    });
    excerpts.registerTool(
      'extract_excerpt',
      {
        inputSchema: {
          source_url: z.string(),
          from: z.number().int().min(0).default(0),
          limit: z.number().int().positive(),
          pages: z.string(),
        },
      },
      async ({ source_url, from, limit, pages }) => {
        const response = await fetch(source_url, { redirect: 'error' });
        if (!response.ok)
          return { isError: true, content: [{ type: 'text', text: 'source_unavailable' }] };
        const characters = Array.from(await response.text());
        const excerpt = characters.slice(from, from + limit).join('');
        excerptCalls.push({ from, pages });
        const payload =
          coverage === undefined
            ? { excerpt }
            : {
                excerpt,
                resume_at:
                  from + limit < characters.length ? from + Array.from(excerpt).length : null,
                extent: characters.length,
                selection: pages,
                coverage,
              };
        return {
          structuredContent: payload,
          content: [{ type: 'text', text: JSON.stringify(payload) }],
        };
      }
    );
    sections.registerTool(
      'render_part',
      {
        inputSchema: {
          download_uri: z.string(),
          bookmark: z.string().optional(),
          section: z.string(),
        },
      },
      async ({ download_uri, bookmark: continuation, section }) => {
        const response = await fetch(download_uri, { redirect: 'error' });
        if (!response.ok)
          return { isError: true, content: [{ type: 'text', text: 'source_unavailable' }] };
        const characters = Array.from(await response.text());
        if (continuation !== undefined && continuation !== bookmark)
          return { isError: true, content: [{ type: 'text', text: 'invalid_bookmark' }] };
        sectionCalls.push({ bookmark: continuation, section });
        const payload = {
          body: (continuation === undefined ? characters.slice(0, 3) : characters.slice(3)).join(
            ''
          ),
          after: continuation === undefined ? bookmark : null,
          area: section,
          assessment: { selected_sections: [section], unread_sections: ['appendix'] },
        };
        return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
      }
    );
    const origin = await connect(m365);
    const readerA = await connect(excerpts);
    const readerB = await connect(sections);
    expect((await origin.listTools()).tools.map((tool) => tool.name)).toContain('get-download-url');
    expect((await readerA.listTools()).tools[0].name).toBe('extract_excerpt');
    expect((await readerB.listTools()).tools[0].name).toBe('render_part');
    async function freshUrl() {
      const result = await origin.callTool({
        name: 'get-download-url',
        arguments: { target, account },
      });
      expect(result.isError).not.toBe(true);
      const url = json(result).downloadUrl;
      if (typeof url !== 'string') throw new Error('Missing download URL');
      return url;
    }

    const firstUrl = await freshUrl();
    const first = await readerA.callTool({
      name: 'extract_excerpt',
      arguments: { source_url: firstUrl, limit: 3, pages: '2' },
    });
    expect(first.structuredContent).toEqual(json(first));
    expect(first.structuredContent).toEqual({
      excerpt: 'A😀B',
      resume_at: 3,
      extent: 8,
      selection: '2',
      coverage,
    });
    expect(String(first.structuredContent!.excerpt).length).toBe(4); // UTF-16 differs from the reader's code-point cursor.
    const secondUrl = await freshUrl();
    expect(secondUrl === firstUrl).toBe(false);
    const second = await readerA.callTool({
      name: 'extract_excerpt',
      arguments: {
        source_url: secondUrl,
        from: first.structuredContent!.resume_at,
        limit: 100,
        pages: '2',
      },
    });
    expect(second.structuredContent).toEqual(json(second));
    expect(second.structuredContent!.resume_at).toBeNull();
    expect(String(first.structuredContent!.excerpt) + second.structuredContent!.excerpt).toBe(
      source
    );
    expect(excerptCalls).toEqual([
      { from: 0, pages: '2' },
      { from: 3, pages: '2' },
    ]);

    const consumed = await readerA.callTool({
      name: 'extract_excerpt',
      arguments: {
        source_url: secondUrl,
        from: first.structuredContent!.resume_at,
        limit: 100,
        pages: '2',
      },
    });
    expect(consumed.isError).toBe(true);
    expect(json(second).coverage).toEqual(coverage); // Output exhaustion retains selected-source evidence.
    const recovered = await readerA.callTool({
      name: 'extract_excerpt',
      arguments: {
        source_url: await freshUrl(),
        from: first.structuredContent!.resume_at,
        limit: 100,
        pages: '2',
      },
    });
    expect(recovered.structuredContent).toEqual(second.structuredContent);

    const part1 = await readerB.callTool({
      name: 'render_part',
      arguments: { download_uri: await freshUrl(), section: 'body' },
    });
    expect(part1.structuredContent).toBeUndefined();
    const part2 = await readerB.callTool({
      name: 'render_part',
      arguments: {
        download_uri: await freshUrl(),
        bookmark: json(part1).after,
        section: 'body',
      },
    });
    expect(json(part1).after).toBe(bookmark);
    expect(json(part2)).toEqual({
      body: '\nCDE\n',
      after: null,
      area: 'body',
      assessment: { selected_sections: ['body'], unread_sections: ['appendix'] },
    });
    expect(sectionCalls).toEqual([
      { bookmark: undefined, section: 'body' },
      { bookmark, section: 'body' },
    ]);

    const evidenceResults = [];
    for (const evidence of [
      { status: 'ocr_partial', unread_pages: [2], skipped_reasons: { '2': 'fixture_budget' } },
      { status: 'text', source_limited: true, omitted_rows: 10 },
      { status: 'empty', selected_pages: [2] },
      undefined, // Legacy output proves no coverage or completion claim.
    ]) {
      coverage = evidence;
      sourceText = evidence?.status === 'empty' ? '' : source;
      const result = await readerA.callTool({
        name: 'extract_excerpt',
        arguments: { source_url: await freshUrl(), limit: 100, pages: '2' },
      });
      expect(result.structuredContent).toEqual(json(result));
      expect(result.structuredContent!.coverage).toEqual(evidence);
      expect(result.structuredContent!.resume_at).toBe(evidence === undefined ? undefined : null);
      if (evidence?.status === 'empty') expect(result.structuredContent!.excerpt).toBe('');
      evidenceResults.push(result);
    }
    // Assert binding without printing credentials or ticket URLs in assertion failures.
    expect(
      graph.downloadStream.mock.calls.every(
        ([path, options]) => path === target && options.accessToken === token
      )
    ).toBe(true);
    expect(
      graph.makeRequest.mock.calls.every(
        ([path, options]) =>
          path === target.replace('/$value', '?$select=name,contentType') &&
          options.accessToken === token
      )
    ).toBe(true);
    expect(auth.getTokenForAccount.mock.calls.every(([value]) => value === account)).toBe(true);
    expect(graph.downloadStream).toHaveBeenCalledTimes(9);
    const outputs = JSON.stringify([
      first,
      second,
      consumed,
      recovered,
      part1,
      part2,
      ...evidenceResults,
    ]);
    expect(outputs.includes(token) || outputs.includes('/attachment?')).toBe(false);
    expect(store.size()).toBe(0);
  } finally {
    resetAttachmentMinting();
    store.clear();
    await Promise.allSettled(clients.map((client) => client.close()));
    await Promise.allSettled([m365.close(), excerpts.close(), sections.close()]);
    if (http.listening) {
      const closed = new Promise<void>((resolve, reject) =>
        http.close((error) => (error ? reject(error) : resolve()))
      );
      http.closeAllConnections();
      await closed;
    }
  }
});
