import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  BasicTracerProvider,
} from '@opentelemetry/sdk-trace-base';
import {
  InMemoryMetricExporter,
  PeriodicExportingMetricReader,
  AggregationTemporality,
  MeterProvider,
} from '@opentelemetry/sdk-metrics';
import { trace, metrics } from '@opentelemetry/api';

const { loggerMock, auditMock, postgresMock } = vi.hoisted(() => ({
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  auditMock: vi.fn(),
  postgresMock: vi.fn(() => ({})),
}));

vi.mock('../../src/logger.js', () => ({
  default: loggerMock,
  rawPinoLogger: loggerMock,
  enableConsoleLogging: vi.fn(),
}));

describe('plan 06-02 — GraphClient.makeRequest parent span + metrics', () => {
  let spanExporter: InMemorySpanExporter;
  let metricExporter: InMemoryMetricExporter;
  let reader: PeriodicExportingMetricReader;

  beforeEach(() => {
    // Clear any pre-existing global providers so our fresh exporters win.
    trace.disable();
    metrics.disable();
    vi.resetModules();
    auditMock.mockClear();
    postgresMock.mockClear();

    spanExporter = new InMemorySpanExporter();
    const tracerProvider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(spanExporter)],
    });
    trace.setGlobalTracerProvider(tracerProvider);

    metricExporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
    reader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 100_000,
    });
    const meterProvider = new MeterProvider({ readers: [reader] });
    metrics.setGlobalMeterProvider(meterProvider);
  });

  afterEach(() => {
    trace.disable();
    metrics.disable();
    vi.restoreAllMocks();
    spanExporter.reset();
  });

  /**
   * Spin up a real GraphClient with a mocked authManager + performRequest
   * override. Full GraphClient construction requires the secrets bundle —
   * a minimal stub is sufficient for unit-level behavior testing.
   */
  async function setupGraphClient(responseOverride: {
    status: number;
    body?: unknown;
    headers?: Record<string, string>;
    throwError?: Error;
  }) {
    const GraphClientModule = await import('../../src/graph-client.js');
    const { requestContext } = await import('../../src/request-context.js');
    const GraphClient = GraphClientModule.default;
    const authManagerStub = {
      getToken: vi.fn(async () => 'access-token-fake'),
    } as unknown as ConstructorParameters<typeof GraphClient>[0];
    const secretsStub = { cloudType: 'global' } as unknown as ConstructorParameters<
      typeof GraphClient
    >[1];
    const client = new GraphClient(authManagerStub, secretsStub, 'json');

    // Override the private performRequest to avoid real fetch() calls.
    (
      client as unknown as {
        performRequest: (
          endpoint: string,
          accessToken: string,
          options: unknown
        ) => Promise<Response | unknown>;
      }
    ).performRequest = vi.fn(async () => {
      if (responseOverride.throwError) throw responseOverride.throwError;
      return {
        status: responseOverride.status,
        headers: {
          get: (k: string) => responseOverride.headers?.[k.toLowerCase()] ?? null,
        },
        text: async () =>
          responseOverride.body !== undefined ? JSON.stringify(responseOverride.body) : '',
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    });
    return { client, requestContext };
  }

  it('emits a graph.request parent span with tenant/tool/alias attrs on 2xx', async () => {
    const { client, requestContext } = await setupGraphClient({
      status: 200,
      headers: { 'request-id': 'graph-req-abc' },
    });
    await requestContext.run({ tenantId: 't-a', toolAlias: 'users.list' }, async () => {
      await client.makeRequest('/users');
    });
    const spans = spanExporter.getFinishedSpans();
    const parent = spans.find((s) => s.name === 'graph.request');
    expect(parent).toBeDefined();
    expect(parent!.attributes['tenant.id']).toBe('t-a');
    expect(parent!.attributes['tool.name']).toBe('users');
    expect(parent!.attributes['tool.alias']).toBe('users.list');
    expect(parent!.attributes['http.status_code']).toBe(200);
    expect(parent!.attributes['graph.request_id']).toBe('graph-req-abc');
  });

  it('captures mcp_tool_calls_total data point with workload prefix on 200', async () => {
    const { client, requestContext } = await setupGraphClient({ status: 200 });
    await requestContext.run({ tenantId: 't-a', toolAlias: 'mail.messages.send' }, async () => {
      await client.makeRequest('/me/messages');
    });
    await reader.forceFlush();
    const collected = metricExporter.getMetrics();
    const series = collected
      .flatMap((b) => b.scopeMetrics.flatMap((sm) => sm.metrics))
      .find((m) => m.descriptor.name === 'mcp_tool_calls_total');
    expect(series).toBeDefined();
    const point = series!.dataPoints.find(
      (p) =>
        (p.attributes as Record<string, unknown>).tenant === 't-a' &&
        (p.attributes as Record<string, unknown>).tool === 'mail' &&
        (p.attributes as Record<string, unknown>).status === '200'
    );
    expect(point).toBeDefined();
  });

  it('records mcp_tool_duration_seconds histogram in SECONDS (<60 for fast mock)', async () => {
    const { client, requestContext } = await setupGraphClient({ status: 200 });
    await requestContext.run({ tenantId: 't-a', toolAlias: 'users.list' }, async () => {
      await client.makeRequest('/users');
    });
    await reader.forceFlush();
    const collected = metricExporter.getMetrics();
    const hist = collected
      .flatMap((b) => b.scopeMetrics.flatMap((sm) => sm.metrics))
      .find((m) => m.descriptor.name === 'mcp_tool_duration_seconds');
    expect(hist).toBeDefined();
    const hpoint = hist!.dataPoints[0] as unknown as { value?: { sum?: number } };
    // Histogram data points are structured as { min, max, sum, count, ... }
    const anyPoint = hist!.dataPoints[0] as unknown as Record<string, unknown>;
    const observedSum =
      (anyPoint.value as { sum?: number } | undefined)?.sum ??
      (anyPoint.sum as number | undefined) ??
      0;
    // A fake call should complete in << 60s — guards against ms-vs-seconds unit mismatch.
    expect(observedSum).toBeLessThan(60);
    // And it must be non-negative (a small positive number for a quick mock).
    expect(observedSum).toBeGreaterThanOrEqual(0);
    // Silence unused binding lint warning
    void hpoint;
  });

  it('increments mcp_graph_throttled_total only on 429', async () => {
    const { client, requestContext } = await setupGraphClient({ status: 429 });
    await requestContext.run({ tenantId: 't-b', toolAlias: 'users.list' }, async () => {
      await client.makeRequest('/users');
    });
    await reader.forceFlush();
    const collected = metricExporter.getMetrics();
    const throttled = collected
      .flatMap((b) => b.scopeMetrics.flatMap((sm) => sm.metrics))
      .find((m) => m.descriptor.name === 'mcp_graph_throttled_total');
    expect(throttled).toBeDefined();
    const tb = throttled!.dataPoints.find(
      (p) => (p.attributes as Record<string, unknown>).tenant === 't-b'
    );
    expect(tb).toBeDefined();
  });

  it('sets span status to ERROR on thrown exception + emits metric with status=0', async () => {
    const { client, requestContext } = await setupGraphClient({
      status: 0,
      throwError: new Error('boom'),
    });
    await expect(
      requestContext.run({ tenantId: 't-c', toolAlias: 'users.list' }, async () => {
        await client.makeRequest('/users');
      })
    ).rejects.toThrow('boom');
    const spans = spanExporter.getFinishedSpans();
    const parent = spans.find((s) => s.name === 'graph.request');
    expect(parent).toBeDefined();
    expect(parent!.status.code).toBe(2 /* SpanStatusCode.ERROR */);
    // Load-bearing operator-triage log line preserved:
    expect(loggerMock.error).toHaveBeenCalled();
  });

  it('sanitizes non-GraphError graphRequest fallback logs and MCP output', async () => {
    const { client } = await setupGraphClient({
      status: 0,
      throwError: new Error('raw-token-123 private@example.com https://graph.microsoft.com/me'),
    });

    const result = await client.graphRequest('/users?skiptoken=raw-token-123');

    const serializedResult = JSON.stringify(result);
    expect(result.isError).toBe(true);
    expect(serializedResult).toContain('Graph API request failed.');
    expect(serializedResult).not.toContain('raw-token-123');
    expect(serializedResult).not.toContain('private@example.com');
    expect(serializedResult).not.toContain('graph.microsoft.com/me');
    const serializedLogs = JSON.stringify(loggerMock.error.mock.calls);
    expect(serializedLogs).not.toContain('raw-token-123');
    expect(serializedLogs).not.toContain('private@example.com');
    expect(serializedLogs).not.toContain('graph.microsoft.com/me');
  });

  it('sanitizes GraphError MCP output and audit metadata', async () => {
    vi.doMock('../../src/lib/postgres.js', () => ({ getPool: postgresMock }));
    vi.doMock('../../src/lib/audit.js', () => ({ writeAuditStandalone: auditMock }));
    const { GraphValidationError } = await import('../../src/lib/graph-errors.js');
    const { client, requestContext } = await setupGraphClient({
      status: 400,
      throwError: new GraphValidationError({
        code: 'invalidRequest',
        message: 'raw-token-123 private@example.com https://graph.microsoft.com/me/messages',
        statusCode: 400,
        requestId: 'graph-request-id',
      }),
    });

    const result = await requestContext.run(
      { tenantId: 'tenant-a', requestId: 'request-a', toolAlias: 'users.list' },
      () => client.graphRequest('/users?skiptoken=raw-token-123')
    );

    const serializedResult = JSON.stringify(result);
    expect(result.isError).toBe(true);
    expect(serializedResult).toContain('Microsoft Graph request failed with status 400.');
    expect(serializedResult).toContain('invalidRequest');
    expect(serializedResult).toContain('graph-request-id');
    expect(serializedResult).not.toContain('raw-token-123');
    expect(serializedResult).not.toContain('private@example.com');
    expect(serializedResult).not.toContain('graph.microsoft.com/me/messages');

    await vi.waitFor(() => expect(auditMock).toHaveBeenCalled());
    const serializedAudit = JSON.stringify(auditMock.mock.calls);
    expect(serializedAudit).toContain('invalidRequest');
    expect(serializedAudit).toContain('graph-request-id');
    expect(serializedAudit).not.toContain('message');
    expect(serializedAudit).not.toContain('raw-token-123');
    expect(serializedAudit).not.toContain('private@example.com');
    expect(serializedAudit).not.toContain('graph.microsoft.com/me/messages');
  });

  it('falls back to tenant=unknown + tool=unknown without RequestContext (stdio mode)', async () => {
    const { client } = await setupGraphClient({ status: 200 });
    // No requestContext.run wrapping — simulates stdio single-tenant mode
    await client.makeRequest('/users');
    const spans = spanExporter.getFinishedSpans();
    const parent = spans.find((s) => s.name === 'graph.request');
    expect(parent).toBeDefined();
    expect(parent!.attributes['tenant.id']).toBe('unknown');
    expect(parent!.attributes['tool.alias']).toBe('unknown');
  });
});
