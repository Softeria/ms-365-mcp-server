import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// MCP Apps (extension spec 2026-01-26): a tool's _meta points at a ui:// HTML resource that
// the host renders in a sandboxed iframe. Hosts without the extension ignore the _meta.
export const MCP_APP_MIME_TYPE = 'text/html;profile=mcp-app';

// The view's <script type="application/json"> holds this until the server fills it in
const CONFIG_PLACEHOLDER = '__MCP_APP_CONFIG__';

// Everything the view shows comes through the host, so it needs no network or frames
const RESOURCE_UI_META = { csp: {}, prefersBorder: true };

export function mcpAppUri(app: string): string {
  return `ui://ms365/${app}.html`;
}

export function mcpAppHtmlPath(app: string): string {
  return path.join(__dirname, 'apps', `${app}.html`);
}

// An Error is cached too, so a broken install logs once instead of on every HTTP request
const views = new Map<string, string | Error>();

function loadView(app: string): string | Error {
  let view = views.get(app);
  if (view === undefined) {
    try {
      view = readFileSync(mcpAppHtmlPath(app), 'utf8');
      if (!view.includes(CONFIG_PLACEHOLDER)) {
        view = new Error(`${app}.html has no ${CONFIG_PLACEHOLDER}`);
      }
    } catch (error) {
      view = error as Error;
    }
    if (view instanceof Error) logger.error(`MCP app ${app} left out: ${view.message}`);
    views.set(app, view);
  }
  return view;
}

const registered = new WeakMap<McpServer, Set<string>>();

/**
 * Registers the app's view on this server, once, and returns the tool _meta that points at
 * it. undefined when the view can't be read: the tool then registers without a UI.
 */
export function mcpAppToolMeta(
  server: McpServer,
  app: string,
  toolName: string
): Record<string, unknown> | undefined {
  const uri = mcpAppUri(app);
  let apps = registered.get(server);
  if (!apps) {
    apps = new Set();
    registered.set(server, apps);
  }
  if (!apps.has(app)) {
    const view = loadView(app);
    if (view instanceof Error) return undefined;
    const config = JSON.stringify({ toolName }).replace(/</g, '\\u003c');
    const html = view.replace(CONFIG_PLACEHOLDER, () => config);
    server.registerResource(
      app,
      uri,
      {
        description: `MCP Apps view for ${toolName}`,
        mimeType: MCP_APP_MIME_TYPE,
        _meta: { ui: RESOURCE_UI_META },
      },
      async () => ({
        contents: [
          { uri, mimeType: MCP_APP_MIME_TYPE, text: html, _meta: { ui: RESOURCE_UI_META } },
        ],
      })
    );
    apps.add(app);
  }
  // Hosts that predate ui.resourceUri read the flat ui/resourceUri key
  return { ui: { resourceUri: uri }, 'ui/resourceUri': uri };
}
