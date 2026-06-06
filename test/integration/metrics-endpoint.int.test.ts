/**
 * Plan 06-03 Task 3 — /metrics integration contract (OPS-07).
 *
 * End-to-end verification of the Prometheus /metrics endpoint:
 *   - Dedicated port hosting PrometheusExporter.getMetricsRequestHandler
 *   - Optional Bearer auth (D-02) — null = open, set = gated
 *   - Full emission path: mcpToolCallsTotal.add() → scraped from /metrics body
 *   - mcp_oauth_pkce_store_size observable gauge populated after
 *     wirePkceStoreGauge() on a non-empty PkceStore
 *   - /healthz public (no auth) so orchestrators can probe without a token
 *   - autoLogging.ignore on /metrics prevents scrape log spam (T-06-03-c)
 *
 * Harness: in-memory. PrometheusExporter is constructed with
 * `preventServerStart: true` and installed as a MetricReader on a test
 * MeterProvider BEFORE importing otel-metrics.ts so the instruments declared
 * at module load register against this reader. createMetricsServer then
 * hosts the exporter's handler on an ephemeral port (0 = kernel-pick) so
 * tests can run in parallel CI without port collision.
 *
 * Integration-tier gate: `.int.test.ts` suffix + `test/integration/` path
 * both match vitest.config.js INTEGRATION_PATTERNS. Runs only when
 * MS365_MCP_INTEGRATION=1. No Testcontainers required — the harness is
 * self-contained (Node http + in-memory exporter).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { metrics } from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

/**
 * Shared call sink captures every log call from any child logger too. pino-http
 * calls `.child()` per-request and emits on the child; a single flat sink is
 * the simplest way to introspect all emissions in the scrape-log-suppression
 * test (without chasing child chains). Every `info/warn/error/debug` on the
 * parent or any descendant child pushes `{ level, args }` here.
 */
const { loggerMock, logCalls } = vi.hoisted(() => {
  const calls: Array<{ level: string; args: unknown[] }> = [];
  type LoggerShape = {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    trace: (...args: unknown[]) => void;
    fatal: (...args: unknown[]) => void;
    silent: (...args: unknown[]) => void;
    level: string;
    levels: { values: Record<string, number> };
    bindings: () => Record<string, unknown>;
    flush: () => void;
    child: (bindings?: Record<string, unknown>) => LoggerShape;
  };
  const makeLogger = (): LoggerShape => {
    const logger: LoggerShape = {
      info: (...args: unknown[]) => {
        calls.push({ level: 'info', args });
      },
      warn: (...args: unknown[]) => {
        calls.push({ level: 'warn', args });
      },
      error: (...args: unknown[]) => {
        calls.push({ level: 'error', args });
      },
      debug: (...args: unknown[]) => {
        calls.push({ level: 'debug', args });
      },
      trace: () => {},
      fatal: () => {},
      silent: () => {},
      level: 'info',
      levels: { values: { debug: 20, info: 30, warn: 40, error: 50, fatal: 60 } },
      bindings: () => ({}),
      flush: () => {},
      child: () => makeLogger(),
    };
    return logger;
  };
  return { loggerMock: makeLogger(), logCalls: calls };
});

vi.mock('../../src/logger.js', () => ({
  default: loggerMock,
  rawPinoLogger: loggerMock,
  enableConsoleLogging: vi.fn(),
}));

/**
 * Install a test MeterProvider whose reader IS the PrometheusExporter under
 * test. Must be called BEFORE importing otel-metrics.ts so the instruments
 * created at module load register against this reader (otherwise the global
 * MeterProvider is the no-op and emits drop silently).
 *
 * `preventServerStart: true` matches plan 06-01's production configuration —
 * the exporter does NOT bind its own listener; createMetricsServer hosts the
 * handler inside an Express app.
 */
function installExporter(): PrometheusExporter {
  metrics.disable();
  const exporter = new PrometheusExporter({ preventServerStart: true });
  const provider = new MeterProvider({ readers: [exporter] });
  metrics.setGlobalMeterProvider(provider);
  return exporter;
}

describe('plan 06-03 — /metrics integration contract (OPS-07)', () => {
  let exporter: PrometheusExporter;
  let metricsServer: Server | undefined;

  beforeEach(() => {
    vi.resetModules();
    exporter = installExporter();
  });

  afterEach(async () => {
    if (metricsServer) {
      await new Promise<void>((resolve) => metricsServer!.close(() => resolve()));
      metricsServer = undefined;
    }
    metrics.disable();
    vi.restoreAllMocks();
  });

  async function startServer(bearerToken: string | null, host?: string): Promise<string> {
    const { createMetricsServer } = await import('../../src/lib/metrics-server/metrics-server.js');
    metricsServer = createMetricsServer(exporter, { port: 0, bearerToken, host });
    await new Promise<void>((resolve) => {
      metricsServer!.once('listening', () => resolve());
    });
    const { port } = metricsServer!.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  it('binds to localhost by default and rejects public unauthenticated binds', async () => {
    const { createMetricsServer } = await import('../../src/lib/metrics-server/metrics-server.js');
    metricsServer = createMetricsServer(exporter, { port: 0, bearerToken: null });
    await new Promise<void>((resolve) => {
      metricsServer!.once('listening', () => resolve());
    });
    const address = metricsServer.address() as AddressInfo;
    expect(address.address).toBe('127.0.0.1');
    await new Promise<void>((resolve) => metricsServer!.close(() => resolve()));
    metricsServer = undefined;

    metricsServer = createMetricsServer(exporter, { port: 0, bearerToken: null, host: '' });
    await new Promise<void>((resolve) => {
      metricsServer!.once('listening', () => resolve());
    });
    const emptyHostAddress = metricsServer.address() as AddressInfo;
    expect(emptyHostAddress.address).toBe('127.0.0.1');
    await new Promise<void>((resolve) => metricsServer!.close(() => resolve()));
    metricsServer = undefined;

    metricsServer = createMetricsServer(exporter, { port: 0, bearerToken: null, host: '   ' });
    await new Promise<void>((resolve) => {
      metricsServer!.once('listening', () => resolve());
    });
    const whitespaceHostAddress = metricsServer.address() as AddressInfo;
    expect(whitespaceHostAddress.address).toBe('127.0.0.1');
    await new Promise<void>((resolve) => metricsServer!.close(() => resolve()));
    metricsServer = undefined;

    expect(() =>
      createMetricsServer(exporter, { port: 0, bearerToken: null, host: '0.0.0.0' })
    ).toThrow(/METRICS_BEARER/);
  });

  it('classifies only localhost and loopback metrics hosts as private', async () => {
    const { createMetricsServer, isPublicMetricsBind } =
      await import('../../src/lib/metrics-server/metrics-server.js');

    expect(isPublicMetricsBind('127.0.0.1')).toBe(false);
    expect(isPublicMetricsBind('127.0.0.2')).toBe(false);
    expect(isPublicMetricsBind('localhost')).toBe(false);
    expect(isPublicMetricsBind('LOCALHOST')).toBe(false);
    expect(isPublicMetricsBind('::1')).toBe(false);
    expect(isPublicMetricsBind('[::1]')).toBe(false);
    expect(isPublicMetricsBind('0:0:0:0:0:0:0:1')).toBe(false);
    expect(isPublicMetricsBind('[0:0:0:0:0:0:0:1]')).toBe(false);
    expect(isPublicMetricsBind('::ffff:127.0.0.1')).toBe(false);
    expect(isPublicMetricsBind('[::ffff:127.0.0.1]')).toBe(false);
    expect(isPublicMetricsBind('0:0:0:0:0:ffff:127.0.0.2')).toBe(false);

    expect(isPublicMetricsBind('0.0.0.0')).toBe(true);
    expect(isPublicMetricsBind('::')).toBe(true);
    expect(isPublicMetricsBind('[::]')).toBe(true);
    expect(isPublicMetricsBind('10.0.0.5')).toBe(true);
    expect(isPublicMetricsBind('192.168.1.50')).toBe(true);
    expect(isPublicMetricsBind('2001:db8::5')).toBe(true);
    expect(isPublicMetricsBind('[2001:db8::5]')).toBe(true);
    expect(isPublicMetricsBind('metrics.internal')).toBe(true);

    expect(() =>
      createMetricsServer(exporter, { port: 0, bearerToken: null, host: '10.0.0.5' })
    ).toThrow(/METRICS_BEARER/);
    expect(() =>
      createMetricsServer(exporter, { port: 0, bearerToken: null, host: 'metrics.internal' })
    ).toThrow(/METRICS_BEARER/);
    expect(() => createMetricsServer(exporter, { port: 0, bearerToken: null, host: '::' })).toThrow(
      /METRICS_BEARER/
    );
  });

  it('allows public metrics binds when Bearer auth is configured', async () => {
    const baseUrl = await startServer('integration-token-abc', '0.0.0.0');
    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.status).toBe(200);
  });

  it('GET /metrics without Bearer when token is set → 401 + WWW-Authenticate: Bearer', async () => {
    const baseUrl = await startServer('integration-token-abc');
    const res = await fetch(`${baseUrl}/metrics`);
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Bearer');
  });

  it('GET /metrics with wrong Bearer → 401', async () => {
    const baseUrl = await startServer('integration-token-abc');
    const res = await fetch(`${baseUrl}/metrics`, {
      headers: { Authorization: 'Bearer wrong' },
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Bearer');
  });

  it('GET /metrics with correct Bearer → 200 + Prometheus exposition containing mcp_tool_calls_total', async () => {
    const baseUrl = await startServer('integration-token-abc');
    // Emit a data point through the full pipeline so the exposition has content.
    const { mcpToolCallsTotal } = await import('../../src/lib/otel-metrics.js');
    mcpToolCallsTotal.add(1, { tenant: 't-int', tool: 'mail', status: '200' });
    const res = await fetch(`${baseUrl}/metrics`, {
      headers: { Authorization: 'Bearer integration-token-abc' },
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/# TYPE mcp_tool_calls_total counter/);
    expect(body).toMatch(/mcp_tool_calls_total\{[^}]*tenant="t-int"/);
  });

  it('GET /metrics open (null token) returns 200 without Authorization header', async () => {
    const baseUrl = await startServer(null);
    const { mcpToolCallsTotal } = await import('../../src/lib/otel-metrics.js');
    mcpToolCallsTotal.add(1, { tenant: 't-open', tool: 'users', status: '200' });
    const res = await fetch(`${baseUrl}/metrics`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/mcp_tool_calls_total/);
  });

  it('GET /healthz (no auth) returns 200 even when Bearer is configured', async () => {
    const baseUrl = await startServer('integration-token-abc');
    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('mcp_oauth_pkce_store_size appears in /metrics after wirePkceStoreGauge on a non-empty store', async () => {
    const baseUrl = await startServer(null);
    const { MemoryPkceStore } = await import('../../src/lib/pkce-store/memory-store.js');
    const { wirePkceStoreGauge } = await import('../../src/lib/otel-metrics.js');
    const pkceStore = new MemoryPkceStore();
    await pkceStore.put('tenant-A', {
      state: 'state-gauge',
      clientCodeChallenge: 'challenge-for-gauge',
      clientCodeChallengeMethod: 'S256',
      serverCodeVerifier: 'server-verifier-gauge',
      clientId: 'client-gauge',
      redirectUri: 'http://localhost/cb',
      tenantId: 'tenant-A',
      createdAt: Date.now(),
    });
    wirePkceStoreGauge(pkceStore);
    // PrometheusExporter.collect() pulls observables synchronously on scrape;
    // the first GET /metrics invocation triggers the observable callback.
    const res = await fetch(`${baseUrl}/metrics`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/mcp_oauth_pkce_store_size/);
  });

  it('/metrics scrape does NOT produce a pino-http completion log (autoLogging.ignore)', async () => {
    const baseUrl = await startServer(null);
    // Empty the shared call sink so we observe only calls made during the
    // scrape itself (startup logs from createMetricsServer would otherwise
    // mask the assertion).
    logCalls.length = 0;
    const res = await fetch(`${baseUrl}/metrics`);
    expect(res.status).toBe(200);
    // pino-http emits a completion log whose merge object includes
    // `req: { url: '/metrics', ... }` when autoLogging runs. The
    // autoLogging.ignore predicate in createMetricsServer suppresses the
    // entire log for any /metrics request. Assert no captured call (at any
    // level, on any child logger) contains the URL /metrics.
    const loggedMetricsScrape = logCalls.some(({ args }) =>
      args.some((arg) => {
        if (arg === null || arg === undefined) return false;
        if (typeof arg === 'string') return arg.includes('/metrics');
        if (typeof arg === 'object') {
          return JSON.stringify(arg).includes('/metrics');
        }
        return false;
      })
    );
    expect(loggedMetricsScrape).toBe(false);
  });
});
