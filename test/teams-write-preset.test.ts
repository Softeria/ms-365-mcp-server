import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { TOOL_CATEGORIES } from '../src/tool-categories.js';

// Contract tests for the teams-write preset: it is a security boundary
// (send-only Teams surface), so its exact tool list, the scopes it can be
// satisfied by, and the absence of read/download tools are all pinned here.
// A change that grows the preset must consciously update this contract.

interface Endpoint {
  toolName: string;
  pathPattern: string;
  method: string;
  presets?: string[];
  scopes?: string[] | string[][];
  workScopes?: string[] | string[][];
}

const endpoints = JSON.parse(
  readFileSync(path.join(__dirname, '../src/endpoints.json'), 'utf8')
) as Endpoint[];

const EXPECTED_TOOLS = [
  'get-chat',
  'get-team',
  'get-team-channel',
  'list-chats',
  'list-joined-teams',
  'list-team-channels',
  'reply-to-channel-message',
  'reply-to-chat-message',
  'send-channel-message',
  'send-chat-message',
  'send-my-activity-notification',
].sort();

// The documented minimal token for the preset (README "teams-write" example).
const WRITE_ONLY_SCOPES = new Set([
  'User.Read',
  'Chat.ReadBasic',
  'ChatMessage.Send',
  'ChannelMessage.Send',
  'Team.ReadBasic.All',
  'Channel.ReadBasic.All',
  'TeamsActivity.Send',
]);

const presetEndpoints = endpoints.filter((e) => e.presets?.includes('teams-write'));

function scopeGroups(endpoint: Endpoint): string[][] {
  const raw = endpoint.workScopes ?? endpoint.scopes ?? [];
  return Array.isArray(raw[0]) ? (raw as string[][]) : [raw as string[]];
}

describe('teams-write preset contract', () => {
  it('contains exactly the expected endpoints', () => {
    const names = presetEndpoints.map((e) => e.toolName).sort();
    expect(names).toEqual(EXPECTED_TOOLS);
  });

  it('exposes exactly the expected tools via its pattern (utilities included, downloaders excluded)', () => {
    const pattern = TOOL_CATEGORIES['teams-write'].pattern;
    for (const tool of [...EXPECTED_TOOLS, 'parse-teams-url']) {
      expect(tool).toMatch(pattern);
    }
    for (const tool of [
      'download-bytes',
      'download-bytes-to-file',
      'get-download-url',
      'list-chat-messages',
      'get-chat-message',
      'list-channel-messages',
      'list-chat-message-hosted-contents',
      'get-meeting-transcript-content',
      'delete-team-channel',
      'remove-team-member',
      'update-chat-message',
      'create-chat',
    ]) {
      expect(tool).not.toMatch(pattern);
    }
  });

  it('every endpoint requests write-only scopes by default (primary group)', () => {
    for (const endpoint of presetEndpoints) {
      const [primary] = scopeGroups(endpoint);
      for (const scope of primary) {
        expect(
          WRITE_ONLY_SCOPES.has(scope),
          `${endpoint.toolName} primary scope ${scope} is outside the write-only set`
        ).toBe(true);
      }
    }
  });

  it('no endpoint touches message content, hosted contents, transcripts, or recordings', () => {
    for (const endpoint of presetEndpoints) {
      if (endpoint.method.toLowerCase() === 'get') {
        expect(endpoint.pathPattern).not.toMatch(
          /messages|hostedContents|transcripts|recordings|attachments/i
        );
      }
    }
  });

  it('requires org mode', () => {
    expect(TOOL_CATEGORIES['teams-write'].requiresOrgMode).toBe(true);
  });
});
