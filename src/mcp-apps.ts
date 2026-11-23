import type { CallToolResult, McpServer } from '@modelcontextprotocol/server';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// MCP Apps (extension spec 2026-01-26): a tool's _meta points at a ui:// HTML resource that
// the host renders in a sandboxed iframe. Hosts without the extension ignore the _meta.
export const MCP_APP_MIME_TYPE = 'text/html;profile=mcp-app';

// A view's page holds these until the server fills them in: the tool's config, then the
// shared bridge and the view's own script (src/apps/bridge.js and <view>.js)
const CONFIG_PLACEHOLDER = '__MCP_APP_CONFIG__';
const BRIDGE_PLACEHOLDER = '__MCP_APP_BRIDGE__';
const SCRIPT_PLACEHOLDER = '__MCP_APP_SCRIPT__';

// Everything a view shows comes through the host, so it needs no network or frames
const RESOURCE_UI_META = { csp: {}, prefersBorder: true };

/** An endpoints.json mcpApp: the view, and the tools it may call, by role */
export interface McpAppBinding {
  view: string;
  tools?: Record<string, string>;
}

// One resource per tool, so tools that share a view each get their own config
export function mcpAppUri(view: string, toolName: string): string {
  return `ui://ms365/${view}/${toolName}.html`;
}

export function mcpAppPath(file: string): string {
  return path.join(__dirname, 'apps', file);
}

// An Error is cached too, so a broken install logs once instead of on every HTTP request
const pages = new Map<string, string | Error>();

// The view's page with both scripts inlined, still waiting for its config
function loadPage(view: string): string | Error {
  let page = pages.get(view);
  if (page === undefined) {
    try {
      page = fill(
        readFileSync(mcpAppPath(`${view}.html`), 'utf8'),
        BRIDGE_PLACEHOLDER,
        script('bridge.js')
      );
      page = fill(page, SCRIPT_PLACEHOLDER, script(`${view}.js`));
      if (!page.includes(CONFIG_PLACEHOLDER)) {
        throw new Error(`${view}.html has no ${CONFIG_PLACEHOLDER}`);
      }
    } catch (error) {
      page = error as Error;
    }
    if (page instanceof Error) logger.error(`MCP app ${view} left out: ${page.message}`);
    pages.set(view, page);
  }
  return page;
}

function script(file: string): string {
  return checkMcpAppScript(file, readFileSync(mcpAppPath(file), 'utf8'));
}

/** A view script's source, refused when it can't go inside the page's <script> element */
export function checkMcpAppScript(file: string, source: string): string {
  // The first </script would end the element. After a <!--, a <script can keep that
  // </script from ending it at all.
  if (/<\/script/i.test(source)) throw new Error(`${file} contains </script`);
  if (source.includes('<!--')) throw new Error(`${file} contains <!--`);
  if (source.includes('__MCP_APP_')) throw new Error(`${file} contains a placeholder`);
  return source;
}

function fill(page: string, placeholder: string, content: string): string {
  if (!page.includes(placeholder)) throw new Error(`the page has no ${placeholder}`);
  // A function, so "$&" and friends in the content are not replacement patterns
  return page.replace(placeholder, () => content);
}

interface ServerApps {
  // Graph tools registered on this server: a view's roles only reach these
  tools: Set<string>;
  // The tools that point at a view
  bindings: Array<{ toolName: string; binding: McpAppBinding }>;
}

const servers = new WeakMap<McpServer, ServerApps>();

/**
 * The tool _meta that points at its view, or undefined when the view can't be loaded: the
 * tool then registers without one. registerMcpAppViews serves the view itself.
 */
export function mcpAppToolMeta(
  binding: McpAppBinding,
  toolName: string
): Record<string, unknown> | undefined {
  if (loadPage(binding.view) instanceof Error) return undefined;
  const uri = mcpAppUri(binding.view, toolName);
  // Hosts that predate ui.resourceUri read the flat ui/resourceUri key
  return { ui: { resourceUri: uri }, 'ui/resourceUri': uri };
}

/**
 * The result of a tool with a view when the model asked for no response body: the model gets
 * the success line it asked for, and the body goes along as structuredContent, which reaches
 * the view with the rest of the result. Without it the view has nothing to show.
 */
export function mcpAppResultWithoutBody(result: CallToolResult): CallToolResult {
  if (result.isError) return result;
  const block = result.content.find((item) => item.type === 'text');
  let body: unknown;
  try {
    body = block?.type === 'text' ? JSON.parse(block.text) : undefined;
  } catch {
    body = undefined;
  }
  return {
    ...result,
    content: [{ type: 'text', text: JSON.stringify({ success: true }) }],
    ...(body && typeof body === 'object' && !Array.isArray(body)
      ? { structuredContent: body as Record<string, unknown> }
      : {}),
  };
}

/** Notes a Graph tool registered on this server, with the view it points at, if any. */
export function noteMcpAppTool(server: McpServer, toolName: string, binding?: McpAppBinding): void {
  let apps = servers.get(server);
  if (!apps) {
    apps = { tools: new Set(), bindings: [] };
    servers.set(server, apps);
  }
  apps.tools.add(toolName);
  if (binding) apps.bindings.push({ toolName, binding });
}

/**
 * Serves the view of each tool noted on this server. It runs once all tools are
 * registered, so a role only reaches the view when its tool is registered here too:
 * --read-only, --enabled-tools, the allowed scopes and discovery all decide that.
 */
export function registerMcpAppViews(server: McpServer): void {
  const apps = servers.get(server);
  if (!apps) return;
  servers.delete(server);
  for (const { toolName, binding } of apps.bindings) {
    const page = loadPage(binding.view);
    if (page instanceof Error) continue;
    const tools: Record<string, string> = {};
    for (const [role, name] of Object.entries(binding.tools ?? {})) {
      if (apps.tools.has(name)) tools[role] = name;
    }
    const config = JSON.stringify({ toolName, tools }).replace(/</g, '\\u003c');
    const html = page.replace(CONFIG_PLACEHOLDER, () => config);
    const uri = mcpAppUri(binding.view, toolName);
    try {
      server.registerResource(
        `${binding.view}:${toolName}`,
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
    } catch (error) {
      logger.error(`MCP app view for ${toolName} left out: ${(error as Error).message}`);
    }
  }
}
