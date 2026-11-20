/**
 * /mcp must accept tool calls carrying base64 file content (drive-file-upload,
 * mail-attachment-add) — Express's default 100 KB JSON limit would 413 them
 * before auth or policy ever ran. Other routes keep the default.
 */
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import MicrosoftGraphServer from '../src/server.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function buildApp() {
  // In-memory client-registry DB, so the test never writes data/sessions.db.
  process.env.MS365_MCP_SESSION_DB_PATH = ':memory:';
  const server = new MicrosoftGraphServer({
    options: { http: '3000', publicUrl: 'https://server.test' } as never,
    secrets: { clientId: 'c', tenantId: 't', clientSecret: 's' },
    sessionManager: {
      createSession: vi.fn(),
      getValidSession: vi.fn().mockResolvedValue(null),
    } as unknown as ConstructorParameters<typeof MicrosoftGraphServer>[0]['sessionManager'],
    policy: {} as never,
    policyAdmins: new Set<string>(),
  });
  server.initialize('1.2.3');
  return server.buildApp();
}

const toolCall = (bytes: number) => ({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'drive-file-upload',
    arguments: { name: 'a.bin', contentBytes: Buffer.alloc(bytes).toString('base64') },
  },
});

describe('/mcp JSON body limit', () => {
  it('parses a 3 MB file upload call (reaches auth, not a 413)', async () => {
    const res = await request(buildApp())
      .post('/mcp')
      .set('Authorization', 'Bearer unknown')
      .send(toolCall(3 * 1024 * 1024));
    expect(res.status).toBe(401);
  });

  it('keeps the default limit on other routes', async () => {
    const res = await request(buildApp())
      .post('/register')
      .send({ redirect_uris: ['https://x.test/cb'], pad: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
  });
});
