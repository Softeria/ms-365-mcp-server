import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  getCombinedPresetPattern,
  presetRequiresOrgMode,
  TOOL_CATEGORIES,
} from '../src/tool-categories.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const endpoints: Array<{ toolName: string; pathPattern: string }> = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'src', 'endpoints.json'), 'utf8')
);
const allToolNames = [...new Set(endpoints.map((e) => e.toolName))];

function matchedTools(preset: string): string[] {
  const re = new RegExp(TOOL_CATEGORIES[preset].pattern.source, 'i');
  return allToolNames.filter((name) => re.test(name));
}

describe('app-scoped presets', () => {
  it.each(['outlook', 'onedrive', 'teams'])('%s matches a non-empty tool set', (preset) => {
    expect(matchedTools(preset).length).toBeGreaterThan(0);
  });

  it('outlook covers mail, calendar and contacts without shared-mailbox or drive leakage', () => {
    const tools = matchedTools('outlook');
    expect(tools).toContain('list-mail-messages');
    expect(tools).toContain('create-calendar-event');
    expect(tools).toContain('list-outlook-contacts');
    expect(tools).not.toContain('list-shared-mailbox-messages');
    expect(tools).not.toContain('get-drive-item');
    expect(tools).not.toContain('list-chats');
  });

  it('onedrive covers drive operations without excel or mail-folder leakage', () => {
    const tools = matchedTools('onedrive');
    expect(tools).toContain('get-drive-root-item');
    expect(tools).toContain('upload-file-content');
    expect(tools).toContain('search-onedrive-files');
    expect(tools).not.toContain('get-excel-range');
    expect(tools).not.toContain('list-mail-folders');
    expect(tools).not.toContain('list-sharepoint-site-drives');
  });

  it('teams covers chats, channels, meetings and presence', () => {
    const tools = matchedTools('teams');
    expect(tools).toContain('list-chats');
    expect(tools).toContain('send-channel-message');
    expect(tools).toContain('create-online-meeting');
    expect(tools).toContain('set-my-presence');
    expect(tools).not.toContain('list-mail-messages');
    expect(tools).not.toContain('list-sharepoint-site-lists');
  });

  it('teams requires org mode', () => {
    expect(presetRequiresOrgMode('teams')).toBe(true);
    expect(presetRequiresOrgMode('outlook')).toBe(false);
    expect(presetRequiresOrgMode('onedrive')).toBe(false);
  });

  it('app preset patterns are exact (anchored), not substring matches', () => {
    const re = new RegExp(TOOL_CATEGORIES.outlook.pattern.source, 'i');
    expect(re.test('list-mail-messages')).toBe(true);
    expect(re.test('list-mail-messages-extra')).toBe(false);
    expect(re.test('x-list-mail-messages')).toBe(false);
  });

  it('app presets compose with other presets via getCombinedPresetPattern', () => {
    const re = new RegExp(getCombinedPresetPattern(['outlook', 'onedrive']), 'i');
    expect(re.test('list-mail-messages')).toBe(true);
    expect(re.test('get-drive-root-item')).toBe(true);
    expect(re.test('list-chats')).toBe(false);
  });
});
