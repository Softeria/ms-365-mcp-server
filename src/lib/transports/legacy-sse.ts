/**
 * Legacy MCP HTTP+SSE shim (plan 03-09, TRANS-02).
 *
 * MCP 2024-11-05 spec: `GET /sse` opens a Server-Sent-Events stream and
 * emits an `endpoint` event carrying the POST URL; the client then POSTs
 * JSON-RPC frames to `/messages`. In the v2.0 shim we honour the `initialize`
 * handshake inline on the /messages endpoint so MCP clients that speak only
 * the legacy spec can complete discovery; everything else returns HTTP 501
 * `legacy_sse_limited_support`. Clients that need full tool support must
 * upgrade to the Streamable HTTP transport (`POST /t/{tenantId}/mcp`).
 *
 * See docs/migration-v1-to-v2.md — "Breaking Change: Legacy HTTP+SSE Shim".
 *
 * Pitfall 8 mitigation (RESEARCH.md, Pitfall 8): SSE double-buffering under
 * reverse proxies. We set `Content-Type: text/event-stream`,
 * `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, and
 * `X-Accel-Buffering: no` on the response. Server-side headers alone are not
 * sufficient — operators MUST also configure their reverse proxy
 * (`proxy_buffering off` on nginx / `flush_interval -1` on Caddy).
 *
 * Long-lived stream: `req.setTimeout(0) + res.setTimeout(0)` so Express's
 * default idle timeout does not kill the connection. Keepalive `:\n\n`
 * every 30s prevents proxy and browser idle-timeout drops. The interval is
 * `.unref()`-ed so it does NOT keep the event loop alive during shutdown;
 * `req.on('close', ...)` clears the interval when the client disconnects.
 *
 * Retirement timeline: default-on flag in v2.1, removal in v2.2 (Claude's
 * discretion per CONTEXT.md D-CTX). Clients migrate to Streamable HTTP.
 */
import type { Request, Response, RequestHandler } from 'express';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TenantRow } from '../tenant/tenant-row.js';
import logger from '../../logger.js';
import { version as PACKAGE_VERSION } from '../../version.js';

const KEEPALIVE_MS = 30_000;
const SUPPORTED_PROTOCOL_VERSION = '2024-11-05';

export interface LegacySseDeps {
  buildMcpServer: (tenant: TenantRow) => McpServer;
}

/**
 * Factory: returns an Express RequestHandler for `GET /t/:tenantId/sse`.
 *
 * Response lifecycle:
 *   1. Set SSE + Pitfall 8 mitigation headers and flush them.
 *   2. Emit the `event: endpoint` frame carrying the POST URL.
 *   3. Start a keepalive interval writing `:\n\n` every 30s.
 *   4. Clear the interval on client disconnect (req.on('close')).
 */
export function createLegacySseGetHandler(_deps: LegacySseDeps): RequestHandler {
  return (req: Request, res: Response): void => {
    const tenant = (req as Request & { tenant?: TenantRow }).tenant;
    if (!tenant) {
      res.status(500).json({ error: 'loadTenant_middleware_missing' });
      return;
    }

    // Long-lived stream: disable Express / Node's default idle timeout so the
    // SSE connection can stay open indefinitely.
    req.setTimeout(0);
    res.setTimeout(0);

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Pitfall 8: disable nginx / Caddy buffering for this route. Operator
      // runbook must ALSO configure `proxy_buffering off` on the reverse
      // proxy — server-side headers alone are insufficient.
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    // Initial endpoint event per MCP 2024-11-05 spec.
    res.write(`event: endpoint\ndata: /t/${tenant.id}/messages\n\n`);

    // keepalive timer — setInterval fires every KEEPALIVE_MS and writes
    // `:\n\n` (SSE comment frame) to the open stream.
    const keepalive = setInterval(() => {
      try {
        res.write(':\n\n');
      } catch (err) {
        logger.warn(
          { err: (err as Error).message, tenantId: tenant.id },
          'legacy SSE keepalive write failed; clearing interval'
        );
        clearInterval(keepalive);
      }
    }, KEEPALIVE_MS);
    // .unref() so the timer does not keep the event loop alive during
    // graceful shutdown. If the process is exiting, we do not need to keep
    // sending keepalives.
    keepalive.unref();

    req.on('close', () => clearInterval(keepalive));
  };
}

/**
 * Factory: returns an Express RequestHandler for `POST /t/:tenantId/messages`.
 *
 * Contract:
 *   - JSON-RPC `initialize`: honoured inline — we return a 200 response with
 *     the MCP server's protocolVersion + capabilities + serverInfo so MCP
 *     clients can complete discovery over the legacy channel.
 *   - Any other method: HTTP 501 `legacy_sse_limited_support` with a hint to
 *     upgrade. Full bidirectional SSE tool support would require stateful
 *     session machinery we explicitly don't build for the v2.0 shim (see
 *     docs/migration-v1-to-v2.md for the rationale).
 *
 * Why we don't forward non-initialize requests through an inline McpServer:
 * the legacy shim is stateless; the McpServer's tool handlers depend on a
 * connected transport for streaming responses. Calling `server.connect()`
 * per request without a transport that writes back to the client results in
 * truncated responses. Returning 501 is honest + actionable (the hint tells
 * the client exactly what to upgrade to).
 */
export function createLegacySsePostHandler(_deps: LegacySseDeps): RequestHandler {
  return (req: Request, res: Response): void => {
    const tenant = (req as Request & { tenant?: TenantRow }).tenant;
    if (!tenant) {
      res.status(500).json({ error: 'loadTenant_middleware_missing' });
      return;
    }

    try {
      const body = req.body as { jsonrpc?: string; id?: number | string; method?: string } | null;
      if (body?.method === 'initialize') {
        res.status(200).json({
          jsonrpc: '2.0',
          id: body.id ?? null,
          result: {
            protocolVersion: SUPPORTED_PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: { name: 'ms-365-mcp-server', version: PACKAGE_VERSION },
          },
        });
        return;
      }

      // Top-level `error` (bare string) + `hint` matches the shape used
      // throughout src/server.ts error responses (see createAuthorizeHandler's
      // `invalid_redirect_uri` 400). Keeping a single, well-known surface
      // makes client retry logic straightforward. `jsonrpc` + `id` are carried
      // through so MCP clients that parse JSON-RPC envelopes still have the
      // correlation.
      res.status(501).json({
        error: 'legacy_sse_limited_support',
        hint: 'Legacy SSE has limited Phase 08 support. Use /t/{tenantId}/mcp for the full Streamable HTTP connector surface.',
        jsonrpc: '2.0',
        id: body?.id ?? null,
      });
    } catch (err) {
      logger.error(
        { err: (err as Error).message, tenantId: tenant.id },
        'legacy SSE /messages handler failed'
      );
      if (!res.headersSent) {
        res.status(500).json({ error: 'sse_shim_error', detail: (err as Error).message });
      }
    }
  };
}

// Consolidated response body for the 501 branch. The spread above writes a
// JSON-RPC-shaped error plus a bare `error_code`/`hint` pair — clients can
// pick whichever surface they parse.
