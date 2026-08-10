import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
// @ts-expect-error - generator module is plain JS with no type declarations
import {
  synthesizeDescriptionFromToolName,
  replaceNavPropertyStub,
} from '../bin/modules/simplified-openapi.mjs';

// Microsoft's v1.0 spec gives CRUD-over-navigation-property operations no prose at all,
// just scaffolding naming the property ("Create new navigation property to messages for
// users"). That string used to reach the model as the tool description. See issue #610
// for the same defect class reported against list-mail-messages.

describe('synthesizeDescriptionFromToolName', () => {
  const CASES: Array<[string, string]> = [
    ['create-shared-mailbox-draft', 'Create a shared mailbox draft.'],
    ['delete-mail-attachment', 'Delete a mail attachment.'],
    // Verb comes from the tool name, not the HTTP method: this one is a PATCH, and
    // "Update an Excel range" would lose the point of it.
    ['sort-excel-range', 'Sort an Excel range.'],
    ['format-excel-range', 'Format an Excel range.'],
    // Product names get their casing back, and "OneDrive" takes "a" despite the vowel.
    ['delete-onedrive-file', 'Delete a OneDrive file.'],
    ['create-sharepoint-site-onenote-notebook', 'Create a SharePoint site OneNote notebook.'],
    // Compound verbs are spelled out rather than chained token by token.
    ['move-rename-onedrive-item', 'Move or rename a OneDrive item.'],
    ['tentatively-accept-event', 'Tentatively accept an event.'],
    // The verb phrase already carries the preposition.
    ['reply-to-chat-message', 'Reply to a chat message.'],
    // No article for lists, plurals, or possessives.
    ['list-chats', 'List chats.'],
    ['add-excel-table-rows', 'Add Excel table rows.'],
    ['update-my-calendar-permission', 'Update my calendar permission.'],
    // Mass nouns take no article either.
    ['send-mail', 'Send mail.'],
    ['upload-file-content', 'Upload file content.'],
    ['get-mail-message-mime', 'Get mail message mime.'],
    ['get-drive-delta', 'Get drive delta.'],
  ];

  for (const [toolName, expected] of CASES) {
    it(`${toolName} -> ${expected}`, () => {
      expect(synthesizeDescriptionFromToolName(toolName)).toBe(expected);
    });
  }

  // "list" is a noun here as often as a verb (SharePoint list, room list), so it must not
  // be consumed as a second verb.
  it('treats a non-leading "list" as a noun', () => {
    expect(synthesizeDescriptionFromToolName('get-list-items')).toBe('Get list items.');
  });

  // copilot and graph are the only tool-name leads that are not verbs. Returning null
  // means Microsoft's own text is kept, which is the safe direction.
  it('returns null when the tool name does not start with a known verb', () => {
    expect(synthesizeDescriptionFromToolName('copilot-retrieve')).toBeNull();
    expect(synthesizeDescriptionFromToolName('graph-batch')).toBeNull();
  });
});

describe('replaceNavPropertyStub', () => {
  it('replaces each of the five stub shapes', () => {
    expect(
      replaceNavPropertyStub('Create new navigation property to messages for users', 'create-x-y')
    ).not.toContain('navigation property');
    expect(
      replaceNavPropertyStub(
        'Update the navigation property format in drives',
        'format-excel-range'
      )
    ).toBe('Format an Excel range.');
    expect(
      replaceNavPropertyStub(
        'Delete navigation property attachments for me',
        'delete-mail-attachment'
      )
    ).toBe('Delete a mail attachment.');
    expect(replaceNavPropertyStub('Get chats from me', 'list-chats')).toBe('List chats.');
    // Actions and functions get the same treatment in a different shape, and this is the
    // shape that actually reaches the model most often.
    expect(replaceNavPropertyStub('Invoke action sort', 'sort-excel-range')).toBe(
      'Sort an Excel range.'
    );
    expect(replaceNavPropertyStub('Invoke function usedRange', 'get-excel-used-range')).toBe(
      'Get an Excel used range.'
    );
  });

  // Property annotations describe the wrong subject but often carry real detail, and
  // descriptionOverride in endpoints.json is the right tool for those. Only prose-free
  // scaffolding is replaced.
  it('leaves descriptions containing real prose alone', () => {
    const annotation = 'The messages in a mailbox or folder. Read-only. Nullable.';
    expect(replaceNavPropertyStub(annotation, 'get-shared-mailbox-message')).toBe(annotation);

    const terse = 'Read the properties and relationships of a todoTask object.';
    expect(replaceNavPropertyStub(terse, 'get-todo-task')).toBe(terse);
  });

  it('keeps the original when the tool name yields no verb', () => {
    const stub = 'Get chats from me';
    expect(replaceNavPropertyStub(stub, 'copilot-retrieve')).toBe(stub);
  });

  it('passes through an absent description', () => {
    expect(replaceNavPropertyStub(undefined, 'list-chats')).toBeUndefined();
  });
});

// The generated clients are produced by `npm run generate` (run in CI before tests).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const readGenerated = (name: string) =>
  readFileSync(path.join(repoRoot, 'src', 'generated', name), 'utf8');

// What matters is the description the model ends up with, not the one in the generated
// client. A tool with a descriptionOverride never shows its generated text - graph-tools
// swaps it in at registration - so a leftover stub there is unreachable, and copilot-retrieve
// relies on exactly that (its name has no verb to synthesize from).
const overridden = new Set(
  (
    JSON.parse(readFileSync(path.join(repoRoot, 'src', 'endpoints.json'), 'utf8')) as Array<{
      toolName: string;
      descriptionOverride?: string;
    }>
  )
    .filter((e) => e.descriptionOverride)
    .map((e) => e.toolName)
);

// Looser than the generator's pattern in the middle, so a scaffolding variant Microsoft
// has not used yet still trips this, but anchored at both ends for the same reason the
// generator anchors. Without the end anchor a stub prefix followed by real prose gets
// flagged, and the generator is right to keep those - "Get the todoTask resources from
// the tasks navigation property of a specified todoTaskList." is a real description.
const STUB_SHAPES =
  /^(?:Create new navigation property[^.]*|Update the navigation property[^.]*|Delete navigation property[^.]*|Get \S+ from \S+|Invoke (?:action|function) \S+)\.?$/i;

function describedEndpoints(source: string): Array<[string, string]> {
  const found: Array<[string, string]> = [];
  const re = /alias: '([^']+)',\s*\n\s*description: `([\s\S]*?)`,/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) found.push([match[1], match[2]]);
  return found;
}

describe.each(['client.ts', 'client-beta.ts'])(
  '%s reaches the model without scaffolding',
  (name) => {
    it('no tool description is left as spec scaffolding', () => {
      const stubs = describedEndpoints(readGenerated(name))
        .filter(([alias, description]) => STUB_SHAPES.test(description) && !overridden.has(alias))
        .map(([alias, description]) => `${alias}: ${description}`);
      expect(stubs).toEqual([]);
    });
  }
);

describe('generated client describes the operation instead', () => {
  it('synthesizes from the tool name', () => {
    const client = readGenerated('client.ts');
    expect(client).toContain('Create a shared mailbox draft.');
    expect(client).toContain('Sort an Excel range.');
  });

  // Endpoints Microsoft never published take the same synthesized sentence rather than
  // their llmTip, which graph-tools appends to the description anyway.
  it('does not fall back to the llmTip for endpoints missing from the spec', () => {
    const client = readGenerated('client.ts');
    expect(client).toContain('Format an Excel range font.');
    expect(client).toContain('Update SharePoint site OneNote page content.');
  });
});
