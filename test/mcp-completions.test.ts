import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestContext } from '../src/request-context.js';
import { DISCOVERY_PRESET_VERSION } from '../src/lib/tenant-surface/surface.js';

vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      { alias: 'list-users' },
      { alias: 'list-groups' },
      { alias: 'mail.read-message' },
      { alias: 'disabled-alias' },
    ],
  },
}));

const listVisibleSkillRecordsMock = vi.fn();
const listRecipesMock = vi.fn();
const listBookmarksMock = vi.fn();
const listFactsForAdminMock = vi.fn();

vi.mock('../src/lib/mcp-skills/store.js', () => ({
  listVisibleSkillRecords: listVisibleSkillRecordsMock,
}));
vi.mock('../src/lib/memory/recipes.js', () => ({
  listRecipes: listRecipesMock,
}));
vi.mock('../src/lib/memory/bookmarks.js', () => ({
  listBookmarks: listBookmarksMock,
}));
vi.mock('../src/lib/memory/facts.js', () => ({
  listFactsForAdmin: listFactsForAdminMock,
}));

const {
  completeAlias,
  completeBookmark,
  completeFactScope,
  completeRecipeName,
  completeSkillName,
} = await import('../src/lib/mcp-completions/handlers.js');

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

function discoveryContext(
  tenantId = TENANT_A,
  enabledToolsSet = new Set(['list-users', 'mail.read-message'])
) {
  return {
    tenantId,
    presetVersion: DISCOVERY_PRESET_VERSION,
    enabledToolsSet,
    enabledToolsExplicit: true,
  };
}

describe('MCP local completion providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('suggests only enabled discovery aliases and omits disabled aliases', () => {
    const values = requestContext.run(discoveryContext(), () => completeAlias(''));

    expect(values).toContain('list-users');
    expect(values).toContain('mail.read-message');
    expect(values).not.toContain('disabled-alias');
  });

  it('fails closed without tenant context', async () => {
    await expect(completeSkillName('skill')).resolves.toEqual([]);
    await expect(completeRecipeName('recipe')).resolves.toEqual([]);
    await expect(completeBookmark('bookmark')).resolves.toEqual([]);
    await expect(completeFactScope('scope')).resolves.toEqual([]);
  });

  it('scopes skills, recipes, bookmarks, and facts to the caller tenant and owner', async () => {
    listVisibleSkillRecordsMock.mockImplementation(
      async (tenantId: string, ownerSubject?: string) =>
        tenantId === TENANT_A && ownerSubject === 'user-a'
          ? [{ name: 'summarize-mail' }, { name: 'plan-meeting' }]
          : [{ name: 'other-tenant-skill' }]
    );
    listRecipesMock.mockImplementation(async (tenantId: string) =>
      tenantId === TENANT_A ? [{ name: 'daily-digest' }] : [{ name: 'tenant-b-recipe' }]
    );
    listBookmarksMock.mockImplementation(async (tenantId: string) =>
      tenantId === TENANT_A
        ? [{ label: 'Inbox', alias: 'list-mail-messages' }]
        : [{ label: 'Other', alias: 'list-users' }]
    );
    listFactsForAdminMock.mockImplementation(async (tenantId: string) =>
      tenantId === TENANT_A
        ? { facts: [{ scope: 'mail' }, { scope: 'meetings' }], nextCursor: null }
        : { facts: [{ scope: 'other' }], nextCursor: null }
    );

    const resultA = await requestContext.run(discoveryContext(TENANT_A), async () => ({
      skills: await completeSkillName('', { ownerSubject: 'user-a' }),
      recipes: await completeRecipeName(''),
      bookmarks: await completeBookmark(''),
      facts: await completeFactScope('m'),
    }));
    const resultB = await requestContext.run(discoveryContext(TENANT_B), async () => ({
      skills: await completeSkillName('', { ownerSubject: 'user-b' }),
      recipes: await completeRecipeName(''),
      bookmarks: await completeBookmark(''),
      facts: await completeFactScope(''),
    }));

    expect(resultA).toEqual({
      skills: ['summarize-mail', 'plan-meeting'],
      recipes: ['daily-digest'],
      bookmarks: ['Inbox', 'list-mail-messages'],
      facts: ['mail', 'meetings'],
    });
    expect(resultB.skills).toEqual(['other-tenant-skill']);
    expect(resultB.recipes).toEqual(['tenant-b-recipe']);
    expect(resultB.bookmarks).toEqual(['Other', 'list-users']);
    expect(resultB.facts).toEqual(['other']);
  });
});
