import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

export interface ToolCategory {
  name: string;
  pattern: RegExp;
  description: string;
  requiresOrgMode?: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const endpointEntries = JSON.parse(
  readFileSync(path.join(__dirname, 'endpoints.json'), 'utf8')
) as Array<{ toolName: string; app?: string }>;

// App presets are exact tool-name allow-lists built from the "app" field in
// endpoints.json, so they can't over-match across apps the way the loose
// name regexes can (e.g. "mail" also matching shared-mailbox tools).
function appPresetPattern(app: string): RegExp {
  const names = [...new Set(endpointEntries.filter((e) => e.app === app).map((e) => e.toolName))];
  return new RegExp(`^(?:${names.join('|')})$`);
}

export const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  mail: {
    name: 'mail',
    pattern: /mail|attachment|draft|download-bytes/i,
    description: 'Email operations (read, send, manage folders, attachments)',
  },
  calendar: {
    name: 'calendar',
    pattern: /calendar|event|schedule|meeting/i,
    description: 'Calendar and event management',
  },
  files: {
    name: 'files',
    pattern: /drive|file|upload|download|folder|item/i,
    description: 'OneDrive file and folder operations',
  },
  personal: {
    name: 'personal',
    pattern:
      /mail|calendar|drive|contact|todo|onenote|attachment|draft|event|file|folder|search|query|download-bytes|parse-teams-url/i,
    description:
      'Personal productivity tools (mail, calendar, files, contacts, tasks, notes, search)',
  },
  work: {
    name: 'work',
    pattern:
      /team|channel|chat|sharepoint|planner|site|list|shared|search|query|download-bytes|schedule|meeting/i,
    description: 'Organization/work tools (Teams, SharePoint, shared mailboxes, search)',
    requiresOrgMode: true,
  },
  excel: {
    name: 'excel',
    pattern: /excel|worksheet|workbook|range|chart/i,
    description: 'Excel spreadsheet operations',
  },
  contacts: {
    name: 'contacts',
    pattern: /contact/i,
    description: 'Outlook contacts management',
  },
  tasks: {
    name: 'tasks',
    pattern: /todo|planner|task/i,
    description: 'Task and planning tools (To Do, Planner)',
  },
  onenote: {
    name: 'onenote',
    pattern: /onenote|notebook|section|page/i,
    description: 'OneNote notebook operations',
  },
  search: {
    name: 'search',
    pattern: /search|query/i,
    description: 'Microsoft Search capabilities',
  },
  users: {
    name: 'users',
    pattern: /user|list-users|download-bytes/i,
    description: 'User directory access',
    requiresOrgMode: true,
  },
  outlook: {
    name: 'outlook',
    pattern: appPresetPattern('outlook'),
    description: 'Outlook app only: mail, calendar and contacts (exact tool list)',
  },
  onedrive: {
    name: 'onedrive',
    pattern: appPresetPattern('onedrive'),
    description: 'OneDrive app only: drive and file operations, excluding Excel (exact tool list)',
  },
  teams: {
    name: 'teams',
    pattern: appPresetPattern('teams'),
    description: 'Teams app only: chats, channels, meetings and presence (exact tool list)',
    requiresOrgMode: true,
  },
  all: {
    name: 'all',
    pattern: /.*/,
    description: 'All available tools',
  },
};

export function getCombinedPresetPattern(presets: string[]): string {
  const patterns = presets.map((preset) => {
    const category = TOOL_CATEGORIES[preset];
    if (!category) {
      throw new Error(
        `Unknown preset: ${preset}. Available presets: ${Object.keys(TOOL_CATEGORIES).join(', ')}`
      );
    }
    return category.pattern.source;
  });
  return patterns.join('|');
}

export function listPresets(): Array<{
  name: string;
  description: string;
  requiresOrgMode?: boolean;
}> {
  return Object.values(TOOL_CATEGORIES).map((category) => ({
    name: category.name,
    description: category.description,
    requiresOrgMode: category.requiresOrgMode,
  }));
}

export function presetRequiresOrgMode(preset: string): boolean {
  const category = TOOL_CATEGORIES[preset];
  return category?.requiresOrgMode || false;
}
