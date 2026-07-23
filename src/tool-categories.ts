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
) as Array<{ toolName: string; presets?: string[] }>;

// Preset metadata. Membership lives in endpoints.json: each endpoint declares
// which presets it belongs to via its `presets` array, so presets are exact
// tool-name allow-lists that can't over-match across apps the way the old
// loose name regexes could (e.g. "mail" also matching shared-mailbox tools).
const PRESET_META: Record<string, { description: string; requiresOrgMode?: boolean }> = {
  mail: {
    description: 'Email operations (read, send, manage folders, attachments)',
  },
  calendar: {
    description: 'Calendar and event management',
  },
  files: {
    description: 'OneDrive file and folder operations',
  },
  personal: {
    description:
      'Personal productivity tools (mail, calendar, files, contacts, tasks, notes, search)',
  },
  work: {
    description: 'Organization/work tools (Teams, SharePoint, shared mailboxes, search)',
    requiresOrgMode: true,
  },
  excel: {
    description: 'Excel spreadsheet operations',
  },
  contacts: {
    description: 'Outlook contacts management',
  },
  tasks: {
    description: 'Task and planning tools (To Do, Planner)',
  },
  onenote: {
    description: 'OneNote notebook operations',
  },
  search: {
    description: 'Microsoft Search capabilities',
  },
  users: {
    description: 'User directory access',
    requiresOrgMode: true,
  },
  outlook: {
    description: 'Outlook app only: mail, calendar and contacts',
  },
  onedrive: {
    description: 'OneDrive app only: drive and file operations, excluding Excel',
  },
  teams: {
    description: 'Teams app only: chats, channels, meetings and presence',
    requiresOrgMode: true,
  },
};

// Utility tools (graph-tools.ts UTILITY_TOOLS) are code-defined, not in endpoints.json, so they
// carry no `presets` there and every --preset filter dropped them - e.g. `--preset files` had
// get-drive-item but no downloader, though its llmTip tells the model to call one. Declare their
// preset membership here and fold it into each preset pattern.
//
// download-bytes fetches ANY relative Graph binary path (drive files, attachments, photos, Teams
// content, recordings, OneNote resources), so it belongs in EVERY preset. It is universal rather
// than an enumerated list because a list would silently miss apps and every future preset.
const UNIVERSAL_UTILITY_TOOLS = ['download-bytes'];

// Scoped utilities are only meaningful where the resources they act on appear. get-download-url
// resolves a pre-authenticated URL for drive/SharePoint file content ONLY (not mail/event
// attachments or recordings), so it rides with the drive-backed presets; where it is absent the
// universal download-bytes still reads the bytes. parse-teams-url only parses Teams meeting URLs.
const SCOPED_UTILITY_TOOLS: Record<string, string[]> = {
  'get-download-url': ['files', 'onedrive', 'personal', 'work', 'search'],
  'parse-teams-url': ['teams', 'work'],
};

// Fail fast if a scoped utility references a preset that does not exist (e.g. a typo like
// 'serach'): otherwise the tool would silently never join the intended preset, with no error.
for (const [tool, presets] of Object.entries(SCOPED_UTILITY_TOOLS)) {
  for (const preset of presets) {
    if (!Object.prototype.hasOwnProperty.call(PRESET_META, preset)) {
      throw new Error(
        `SCOPED_UTILITY_TOOLS["${tool}"] references unknown preset "${preset}" (not in PRESET_META)`
      );
    }
  }
}

function presetPattern(preset: string): RegExp {
  const endpointNames = [
    ...new Set(endpointEntries.filter((e) => e.presets?.includes(preset)).map((e) => e.toolName)),
  ];
  // Guard on endpoint membership, not the final `names` list: the universal utility spread below
  // would otherwise mask a preset that no endpoint declares (a typo'd or unwired preset name).
  if (endpointNames.length === 0) {
    throw new Error(`Preset "${preset}" matches no endpoints in endpoints.json`);
  }
  const names = [
    ...endpointNames,
    ...UNIVERSAL_UTILITY_TOOLS,
    ...Object.entries(SCOPED_UTILITY_TOOLS)
      .filter(([, presets]) => presets.includes(preset))
      .map(([name]) => name),
  ];
  return new RegExp(`^(?:${names.join('|')})$`);
}

export const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  ...Object.fromEntries(
    Object.entries(PRESET_META).map(([name, meta]) => [
      name,
      { name, pattern: presetPattern(name), ...meta },
    ])
  ),
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
