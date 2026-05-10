import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '../../graph-tools.js';
import type { ClientCapabilityProfile } from '../mcp-capabilities/profile.js';
import { createMcpResultEnvelope } from '../mcp-results/envelope.js';
import { isDiscoverySurface } from '../tenant-surface/surface.js';
import { APP_DEFINITIONS, type AppDefinition, type DashboardSlug } from './assets.js';
import { readMcpAppResource } from './assets.js';
import { APP_MIME_TYPE, APP_UI_META, assertSecretFreePayload } from './security.js';

export interface RegisterMcpAppsDeps {
  tenant?: { id?: string; preset_version?: string };
  capabilityProfile?: ClientCapabilityProfile;
  registerTools?: boolean;
}

export interface CreateAppViewResultInput {
  dashboard: DashboardSlug;
  toolName?: string;
  profile?: ClientCapabilityProfile;
  summary: string;
  data?: unknown;
  resources?: Array<{ uri: string; name?: string; mimeType?: string; description?: string }>;
  nextActions?: string[];
  warnings?: string[];
}

const APP_UNSUPPORTED_FALLBACK =
  'This dashboard is available as a UI resource in Apps-capable clients. This response includes the same data as text, structured JSON, and m365:// resources.';

const EMPTY_INPUT_SCHEMA = {};

function appDefinitionForSlug(slug: DashboardSlug): AppDefinition {
  const app = APP_DEFINITIONS.find((candidate) => candidate.slug === slug);
  if (!app) throw new Error(`Unknown MCP app dashboard: ${slug}`);
  return app;
}

function appsEffective(profile: ClientCapabilityProfile | undefined): boolean {
  return profile?.capabilities.apps.effective === true;
}

function safeData(data: unknown): unknown {
  const validation = assertSecretFreePayload(data);
  if (!validation.ok) return { warning: validation.reason };
  return data;
}

export function createAppViewResult(input: CreateAppViewResultInput): CallToolResult {
  const app = appDefinitionForSlug(input.dashboard);
  const appEnabled = appsEffective(input.profile);
  const fallbackWarning = appEnabled ? [] : [APP_UNSUPPORTED_FALLBACK];
  const result = createMcpResultEnvelope({
    toolName: input.toolName ?? `${input.dashboard}-view`,
    summary: input.summary,
    data: safeData(input.data),
    resources: input.resources,
    nextActions: input.nextActions ?? ['Open linked m365:// resources for durable follow-up data.'],
    warnings: [...fallbackWarning, ...(input.warnings ?? [])],
    meta: {
      dashboard: input.dashboard,
      ...(appEnabled
        ? {
            ui: { resourceUri: app.uri },
            'ui/resourceUri': app.uri,
          }
        : { fallback: 'apps_unsupported' }),
    },
  });

  const firstContent = result.content[0];
  const firstText =
    firstContent && 'text' in firstContent && typeof firstContent.text === 'string'
      ? firstContent.text
      : '';

  if (!appEnabled && !firstText.includes(APP_UNSUPPORTED_FALLBACK)) {
    return {
      ...result,
      content: [
        {
          type: 'text',
          text: `${firstText}\n\n${APP_UNSUPPORTED_FALLBACK}`,
        },
      ],
    };
  }

  return result;
}

function registerAppResource(server: McpServer, app: AppDefinition): void {
  server.registerResource(
    app.name,
    app.uri,
    {
      title: app.title,
      description: app.description,
      mimeType: APP_MIME_TYPE,
      _meta: APP_UI_META,
    },
    (uri) => readMcpAppResource(uri.toString())
  );
}

function appToolSummary(app: AppDefinition): string {
  return `${app.title} ready.`;
}

function registerAppTool(
  server: McpServer,
  app: AppDefinition,
  profile: ClientCapabilityProfile | undefined
): void {
  server.registerTool(
    `${app.slug}-view`,
    {
      title: app.title,
      description: `${app.description} Returns text, structured JSON, m365:// resource links, and an optional ui:// app link.`,
      inputSchema: EMPTY_INPUT_SCHEMA,
      outputSchema: z.object({}).passthrough(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      _meta: {
        ...(appsEffective(profile)
          ? { ui: { resourceUri: app.uri }, 'ui/resourceUri': app.uri }
          : {}),
        dashboard: app.slug,
      },
    },
    () =>
      createAppViewResult({
        dashboard: app.slug,
        profile,
        summary: appToolSummary(app),
        data: { dashboard: app.slug, title: app.title, items: [] },
        resources: [
          {
            uri: `m365://tenant/current/apps/${app.slug}.json`,
            name: `${app.slug} app data`,
            mimeType: 'application/json',
          },
        ],
      })
  );
}

export function registerMcpApps(server: McpServer, deps: RegisterMcpAppsDeps): void {
  if (!deps.tenant?.id || !isDiscoverySurface(deps.tenant.preset_version)) return;

  for (const app of APP_DEFINITIONS) {
    registerAppResource(server, app);
    if (deps.registerTools !== false) registerAppTool(server, app, deps.capabilityProfile);
  }
}
