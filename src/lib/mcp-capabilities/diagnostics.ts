import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientCapabilityProfile, McpSurfaceMode, McpTransportKind } from './profile.js';
import { buildEffectiveCapabilityProfile, DEFAULT_SERVER_CAPABILITIES } from './profile.js';

export interface ConnectorDiagnosticsInput {
  server: { name: string; version: string };
  tenant?: { id?: string | null; label?: string | null };
  surface: McpSurfaceMode;
  profile: ClientCapabilityProfile;
  metadataUrls?: Record<string, string | undefined>;
  expectedDisplayName?: string;
  requestLike?: unknown;
}

export interface ConnectorDiagnosticsPayload extends Record<string, unknown> {
  server: { name: string; version: string };
  tenant: { id: string };
  surface: McpSurfaceMode;
  transport: McpTransportKind;
  capabilities: ClientCapabilityProfile['capabilities'];
  enabledFeatures: readonly string[];
  disabledFeatures: Array<{ name: string; reason: string }>;
  fallbacks: readonly string[];
  metadataUrls: Record<string, string>;
  expectedDisplayName: string;
}

export interface ConnectorDiagnosticsResult {
  text: string;
  structured: ConnectorDiagnosticsPayload;
}

export interface RegisterConnectorDiagnosticsDeps {
  server: { name: string; version: string };
  tenant?: { id?: string | null; label?: string | null };
  surface: McpSurfaceMode;
  transport: McpTransportKind;
  profile?: ClientCapabilityProfile;
  metadataUrls?: Record<string, string | undefined>;
  expectedDisplayName?: string;
}

const SECRET_KEY_PATTERN = /authorization|cookie|token|secret|password|body/i;
const DEFAULT_DISPLAY_NAME = 'Microsoft 365 MCP Gateway';

export function buildConnectorDiagnostics(
  input: ConnectorDiagnosticsInput
): ConnectorDiagnosticsResult {
  const structured: ConnectorDiagnosticsPayload = Object.freeze({
    server: Object.freeze({ ...input.server }),
    tenant: Object.freeze({ id: safeTenantId(input.tenant?.id) }),
    surface: input.surface,
    transport: input.profile.transport,
    capabilities: input.profile.capabilities,
    enabledFeatures: input.profile.enabledFeatures,
    disabledFeatures: input.profile.disabledFeatures.map((gate) => ({
      name: gate.name,
      reason: gate.disabledReason ?? 'disabled',
    })),
    fallbacks: input.profile.fallbacks,
    metadataUrls: Object.freeze(redactMetadataUrls(input.metadataUrls ?? {})),
    expectedDisplayName: input.expectedDisplayName ?? DEFAULT_DISPLAY_NAME,
  });
  void redactUnknown(input.requestLike);

  return Object.freeze({
    text: diagnosticsText(structured),
    structured,
  });
}

export function registerConnectorDiagnosticsTool(
  server: McpServer,
  deps: RegisterConnectorDiagnosticsDeps
): void {
  server.tool(
    'connector-diagnostics',
    'Explain this connector session capability profile, disabled advanced features, fallbacks, and metadata URLs without exposing tokens or request bodies.',
    {},
    { title: 'connector-diagnostics', readOnlyHint: true, openWorldHint: false },
    async () => {
      const profile =
        deps.profile ??
        buildEffectiveCapabilityProfile({
          protocolVersion: undefined,
          clientInfo: undefined,
          advertisedCapabilities: { tools: {} },
          transport: deps.transport,
          surface: deps.surface,
          tenantPolicy: { phase8Enabled: deps.surface === 'discovery' },
          serverCapabilities: DEFAULT_SERVER_CAPABILITIES,
        });
      const diagnostics = buildConnectorDiagnostics({
        server: deps.server,
        tenant: deps.tenant,
        surface: deps.surface,
        profile,
        metadataUrls: deps.metadataUrls,
        expectedDisplayName: deps.expectedDisplayName,
      });

      return {
        content: [{ type: 'text' as const, text: diagnostics.text }],
        structuredContent: diagnostics.structured,
      };
    }
  );
}

function diagnosticsText(payload: ConnectorDiagnosticsPayload): string {
  const disabled = payload.disabledFeatures.map((feature) => `${feature.name}: ${feature.reason}`);
  const lines = [
    `${payload.expectedDisplayName} connector diagnostics`,
    `Server: ${payload.server.name} ${payload.server.version}`,
    `Tenant: ${payload.tenant.id}`,
    `Surface: ${payload.surface}`,
    `Transport: ${payload.transport}`,
    `Enabled features: ${payload.enabledFeatures.join(', ') || 'none'}`,
    `Disabled features: ${disabled.join('; ') || 'none'}`,
  ];

  if (payload.fallbacks.length > 0) {
    lines.push(...payload.fallbacks);
  }
  if (
    payload.disabledFeatures.some((feature) => feature.reason.includes('client does not advertise'))
  ) {
    lines.push(
      'Your client does not advertise some advanced MCP capabilities; text and JSON fallbacks remain available.'
    );
  }
  return lines.join('\n');
}

function safeTenantId(value: string | null | undefined): string {
  if (!value) return 'unknown';
  return value;
}

function redactMetadataUrls(urls: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(urls)
      .filter(([, value]) => typeof value === 'string' && value.length > 0)
      .map(([key, value]) => [key, redactUrl(value!)])
  );
}

function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_KEY_PATTERN.test(key)) url.searchParams.set(key, '[redacted]');
    }
    return url.toString();
  } catch {
    return SECRET_KEY_PATTERN.test(value) ? '[redacted]' : value;
  }
}

function redactUnknown(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactUnknown);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? '[redacted]' : redactUnknown(nested),
    ])
  );
}
