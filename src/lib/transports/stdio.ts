/**
 * stdio transport (plan 03-09, TRANS-03).
 *
 * Preserves v1 stdio behaviour: single-tenant MCP-over-stdin/stdout for CLI
 * use (Claude Desktop integration, Claude Code, `ms-365-mcp-server --login`).
 *
 * Phase 3 additions:
 *   - Accepts an optional TenantRow via the caller's bootstrap. The tenant
 *     is populated by src/index.ts when `--tenant-id <guid>` (or the env
 *     fallback `MS365_MCP_TENANT_ID`) is present and resolves to a row in
 *     the tenants table.
 *   - Uses MemoryPkceStore (no Redis) + file-backed MSAL cache — the stdio
 *     path MUST NOT depend on the HTTP substrate (Redis / Postgres) so the
 *     `--login` + `--verify-login` subcommands work without Docker.
 *   - Falls back to v1 env-var-based single-tenant behaviour when no tenant
 *     is specified. The bootstrap in src/index.ts constructs a legacy
 *     AuthManager in that branch; startStdioTransport is indifferent — it
 *     just owns the transport plumbing.
 *
 * Graceful shutdown: stdio transport closes on stdin 'end'; the src/index.ts
 * bootstrap registers shutdown hooks (plan 01-05) that flush pino + OTel.
 * We log a single structured info line on connect so operators can
 * correlate a stdio session to a tenant when debugging.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TenantRow } from '../tenant/tenant-row.js';
import logger from '../../logger.js';
import {
  buildEffectiveCapabilityProfile,
  type AdvertisedCapabilities,
  type ClientCapabilityProfile,
  type ClientInfo,
} from '../mcp-capabilities/profile.js';

export interface StdioTransportOptions {
  /** Optional tenant row. Absent when running in v1 legacy single-tenant mode. */
  tenant?: TenantRow;
  /** The McpServer the transport should bind to. Built by createMcpServer(tenant). */
  mcpServer: McpServer;
}

export interface StdioCapabilityProfileInput {
  protocolVersion?: string;
  clientInfo?: ClientInfo;
  advertisedCapabilities?: AdvertisedCapabilities;
  phase8Enabled?: boolean;
}

export function buildStdioCapabilityProfile(
  input: StdioCapabilityProfileInput = {}
): ClientCapabilityProfile {
  return buildEffectiveCapabilityProfile({
    protocolVersion: input.protocolVersion,
    clientInfo: input.clientInfo,
    advertisedCapabilities: input.advertisedCapabilities ?? {},
    transport: 'stdio',
    surface: 'discovery',
    tenantPolicy: { phase8Enabled: input.phase8Enabled ?? true },
  });
}

/**
 * Connect an McpServer to a StdioServerTransport.
 *
 * The function returns once `server.connect(transport)` resolves — the
 * transport stays live for the lifetime of the process. Callers (currently
 * src/index.ts) should await this call before returning control to the
 * top-level `main()` function so graceful-shutdown hooks register at the
 * correct point.
 *
 * Structured log: `{ tenantId, transport: 'stdio' }` — enables pino
 * downstream filters + tenant-scoped troubleshooting even in stdio mode
 * where there is no HTTP request log.
 */
export async function startStdioTransport(opts: StdioTransportOptions): Promise<void> {
  const transport = new StdioServerTransport();
  await opts.mcpServer.connect(transport);
  logger.info(
    {
      tenantId: opts.tenant?.id ?? '(legacy-single-tenant)',
      transport: 'stdio',
    },
    'stdio transport connected'
  );
}
