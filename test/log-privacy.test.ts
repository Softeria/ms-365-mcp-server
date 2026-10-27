// Privacy regression at the real sinks: the registered mail tools, the real
// GraphClient and the crash dump are driven with sentinel text, and the actual
// log files plus the real console transport are checked for it.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';

const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms365-log-privacy-'));
process.env.MS365_MCP_LOG_DIR = logDir;

const SEARCH = 'SENTINEL_SEARCH_quarterly_layoffs_7361';
const FILTER = 'SENTINEL_FILTER_merger_terms_7362';
const CURSOR = 'SENTINEL_CURSOR_salary_review_7363';
const GRAPH_ERROR = 'SENTINEL_GRAPH_ERROR_private_note_7364';
const FILE_NAME = 'SENTINEL_FILE_severance_plan_7365';
const BODY_KEY = 'SENTINEL_KEY_board_minutes_7366';
const SENTINELS = [SEARCH, FILTER, CURSOR, GRAPH_ERROR, FILE_NAME, BODY_KEY];

let consoleOut = '';
const stdoutWrite = process.stdout.write.bind(process.stdout);
const stderrWrite = process.stderr.write.bind(process.stderr);

type Handler = (params: Record<string, unknown>) => Promise<unknown>;

describe('no user content reaches any log sink', () => {
  let logger: typeof import('../src/logger.js').default;
  let calls: Map<string, Handler>;
  let responses: unknown[] = [];

  beforeAll(async () => {
    // Capture everything the real console transport writes. Winston's Console
    // transport prefers console._stdout / console._stderr, which vitest replaces,
    // so both handles and the process streams are captured.
    const capture = ((chunk: string | Uint8Array) => {
      consoleOut += String(chunk);
      return true;
    }) as typeof process.stdout.write;
    process.stdout.write = capture;
    process.stderr.write = capture;
    const c = console as unknown as { _stdout?: { write: unknown }; _stderr?: { write: unknown } };
    if (c._stdout) c._stdout.write = capture;
    if (c._stderr) c._stderr.write = capture;

    const loggerModule = await import('../src/logger.js');
    logger = loggerModule.default;
    loggerModule.enableConsoleLogging();
    // The formatted line every transport (file and console alike) receives.
    logger.on('data', (info: Record<symbol, unknown>) => {
      consoleOut += `${String(info[Symbol.for('message')])}\n`;
    });
    const { registerGraphTools } = await import('../src/graph-tools.js');

    calls = new Map();
    const server = {
      server: { _requestHandlers: new Map() },
      registerTool(name: string, _config: unknown, handler: Handler) {
        calls.set(name, handler);
      },
      tool(name: string, ...args: unknown[]) {
        calls.set(name, args.at(-1) as Handler);
      },
    };
    const client = {
      graphRequest: async () =>
        responses.shift() ?? { content: [{ type: 'text', text: '{"value":[]}' }] },
      serialize: JSON.stringify,
    };
    registerGraphTools(server as never, client as never, { orgMode: true } as never);
  });

  afterAll(() => {
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
    fs.rmSync(logDir, { recursive: true, force: true });
  });

  it('drives the real handlers, client and crash dump with sentinel text', async () => {
    expect(calls.has('list-mail-messages')).toBe(true);
    expect(calls.has('get-mail-message')).toBe(true);

    await calls.get('list-mail-messages')!({ search: `subject:${SEARCH}` });
    await calls.get('get-mail-message')!({
      messageId: 'synthetic-id',
      filter: `body/content eq '${FILTER}'`,
    });
    await calls.get('get-mail-message')!({
      messageId: 'synthetic-id',
      body: { [BODY_KEY]: 'x', subject: FILTER },
    });
    responses = [
      {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              value: [{ id: 'synthetic-1' }],
              '@odata.nextLink': `https://graph.microsoft.com/v1.0/me/messages?$skip=1&$filter=${CURSOR}`,
            }),
          },
        ],
      },
      { content: [{ type: 'text', text: '{"value":[{"id":"synthetic-2"}]}' }] },
    ];
    await calls.get('list-mail-messages')!({ fetchAllPages: true });

    // A real Graph 400 whose message echoes request text, through the real client.
    const { default: GraphClient } = await import('../src/graph-client.js');
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ error: { code: 'BadRequest', message: `Invalid filter ${GRAPH_ERROR}` } }),
        { status: 400, statusText: 'Bad Request' }
      )) as typeof fetch;
    const realClient = new GraphClient(
      { getToken: async () => 'synthetic-token' } as never,
      { cloudType: 'global' } as never
    );
    const result = await realClient.graphRequest(`/me/drive/root:/${FILE_NAME}.txt:/content`);
    expect(result.isError).toBe(true);

    // The crash dump path, with an error carrying content in message, property and cause.
    const { dumpError } = await import('../src/crash-logging.js');
    const crash = Object.assign(new Error(`boom ${GRAPH_ERROR}`), {
      response: { body: FILTER },
      cause: new Error(`inner ${SEARCH}`),
    });
    const dump = JSON.stringify(dumpError(crash));
    for (const s of SENTINELS) expect(dump).not.toContain(s);
    logger.error('uncaughtException', dumpError(crash));

    const finished = once(logger, 'finish');
    logger.end();
    await finished;
    await new Promise((r) => setTimeout(r, 50));

    const files = ['mcp-server.log', 'error.log'].map((f) =>
      fs.existsSync(path.join(logDir, f)) ? fs.readFileSync(path.join(logDir, f), 'utf8') : ''
    );
    expect(files[0].length).toBeGreaterThan(0);
    expect(consoleOut.length).toBeGreaterThan(0);
    for (const text of [...files, consoleOut]) {
      for (const s of SENTINELS) expect(text).not.toContain(s);
    }
    // The useful parts are still there.
    expect(files[0]).toContain('Tool list-mail-messages called with params');
    expect(files[0]).toContain(
      'Fetching page 2 from: https://graph.microsoft.com/v1.0/me/messages [query: $skip, $filter]'
    );
    expect(files[0]).toContain('GraphApiError status=400 code=BadRequest');
  });
});
