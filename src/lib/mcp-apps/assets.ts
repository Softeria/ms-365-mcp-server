import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ErrorCode, McpError, type ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { APP_MIME_TYPE, APP_UI_META, validateAppAssetText } from './security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const APP_ASSET_SOURCE_DIR = path.resolve(__dirname, '..', '..', 'apps');
export const APP_ASSET_DIST_PATHS = Object.freeze([
  'dist/apps/app-shell.html',
  'dist/apps/inbox-triage.html',
  'dist/apps/calendar-brief.html',
  'dist/apps/teams-digest.html',
  'dist/apps/file-search.html',
  'dist/apps/permissions-overview.html',
  'dist/apps/connector-diagnostics.html',
  'dist/apps/skill-editor.html',
]);

const APP_HOST = 'm365';
const APP_SHELL_FILE = 'app-shell.html';

export type DashboardSlug =
  | 'inbox-triage'
  | 'calendar-brief'
  | 'teams-digest'
  | 'file-search'
  | 'permissions-overview'
  | 'connector-diagnostics'
  | 'skill-editor';

export interface AppDefinition {
  slug: DashboardSlug;
  uri: `ui://m365/${DashboardSlug}.html`;
  name: `m365-app-${DashboardSlug}`;
  title: string;
  description: string;
}

export const APP_DEFINITIONS: readonly AppDefinition[] = Object.freeze([
  {
    slug: 'inbox-triage',
    uri: 'ui://m365/inbox-triage.html',
    name: 'm365-app-inbox-triage',
    title: 'Inbox Triage Dashboard',
    description: 'Prioritized mailbox triage dashboard with text and resource fallbacks.',
  },
  {
    slug: 'calendar-brief',
    uri: 'ui://m365/calendar-brief.html',
    name: 'm365-app-calendar-brief',
    title: 'Calendar Brief Dashboard',
    description: 'Upcoming meetings, conflicts, and preparation links.',
  },
  {
    slug: 'teams-digest',
    uri: 'ui://m365/teams-digest.html',
    name: 'm365-app-teams-digest',
    title: 'Teams Digest Dashboard',
    description: 'Recent Teams activity, mentions, unresolved questions, and thread links.',
  },
  {
    slug: 'file-search',
    uri: 'ui://m365/file-search.html',
    name: 'm365-app-file-search',
    title: 'File Search Dashboard',
    description: 'Preview-safe Microsoft 365 file search results and filters.',
  },
  {
    slug: 'permissions-overview',
    uri: 'ui://m365/permissions-overview.html',
    name: 'm365-app-permissions-overview',
    title: 'Permissions Overview Dashboard',
    description: 'High-risk sharing and permissions overview for tenant resources.',
  },
  {
    slug: 'connector-diagnostics',
    uri: 'ui://m365/connector-diagnostics.html',
    name: 'm365-app-connector-diagnostics',
    title: 'Connector Diagnostics Dashboard',
    description: 'Connector identity, metadata URLs, and capability matrix diagnostics.',
  },
  {
    slug: 'skill-editor',
    uri: 'ui://m365/skill-editor.html',
    name: 'm365-app-skill-editor',
    title: 'Skill Editor Dashboard',
    description: 'Editable skill validation, metadata, references, and safe save workflow.',
  },
]);

export interface AssetScanResult {
  ok: boolean;
  findings: string[];
}

function appDefinitionForUri(uri: string): AppDefinition | undefined {
  return APP_DEFINITIONS.find((app) => app.uri === uri);
}

function readAppAsset(fileName: string): string {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'apps', fileName),
    path.resolve(__dirname, '..', '..', '..', 'src', 'apps', fileName),
    path.resolve(__dirname, '..', '..', 'apps', APP_SHELL_FILE),
    path.resolve(__dirname, '..', '..', '..', 'src', 'apps', APP_SHELL_FILE),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf-8');
  }

  throw new McpError(ErrorCode.InvalidParams, 'MCP app asset not found.', {
    code: 'invalid_resource_uri',
  });
}

function parseAppUri(raw: string): AppDefinition {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new McpError(ErrorCode.InvalidParams, 'App resource URI is not a valid URL.', {
      code: 'invalid_resource_uri',
    });
  }

  if (
    url.protocol !== 'ui:' ||
    url.hostname !== APP_HOST ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.port
  ) {
    throw new McpError(ErrorCode.InvalidParams, 'Unsupported app resource URI.', {
      code: 'invalid_resource_uri',
    });
  }

  const app = appDefinitionForUri(url.toString());
  if (!app) {
    throw new McpError(ErrorCode.InvalidParams, 'Unknown app resource URI.', {
      code: 'invalid_resource_uri',
    });
  }
  return app;
}

export async function readMcpAppResource(uri: string): Promise<ReadResourceResult> {
  const app = parseAppUri(uri);
  const fileName = `${app.slug}.html`;
  const text = readAppAsset(fileName);
  const validation = validateAppAssetText(text, fileName);
  if (!validation.ok) {
    throw new McpError(ErrorCode.InternalError, validation.reason ?? 'Invalid MCP app asset.', {
      code: 'invalid_app_asset',
    });
  }

  return {
    contents: [
      {
        uri,
        mimeType: APP_MIME_TYPE,
        text,
        _meta: APP_UI_META,
      },
    ],
  } as ReadResourceResult;
}

export function scanAppAssets(rootDir: string = APP_ASSET_SOURCE_DIR): AssetScanResult {
  const findings: string[] = [];
  if (!fs.existsSync(rootDir)) {
    return { ok: false, findings: [`Missing app asset directory: ${rootDir}`] };
  }

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      findings.push(...scanAppAssets(entryPath).findings);
      continue;
    }
    if (!entry.isFile()) continue;

    const text = fs.readFileSync(entryPath, 'utf-8');
    const validation = validateAppAssetText(text, entryPath);
    if (!validation.ok && validation.reason) findings.push(validation.reason);
  }

  return { ok: findings.length === 0, findings };
}
