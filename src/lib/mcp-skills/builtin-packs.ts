export const BUILTIN_SKILL_PACK_IDS = [
  'inbox-triage',
  'meeting-prep',
  'teams-digest',
  'file-discovery',
  'permissions-security-review',
  'tenant-onboarding',
  'admin-operations',
] as const;

export type BuiltInSkillPackId = (typeof BUILTIN_SKILL_PACK_IDS)[number];

export interface BuiltInSkillPackSummary {
  readonly id: BuiltInSkillPackId;
  readonly title: string;
  readonly description: string;
}

export interface BuiltInSkillPackDefinition extends BuiltInSkillPackSummary {
  readonly pack: Record<string, unknown>;
}

function skill(
  name: string,
  title: string,
  description: string,
  body: string,
  frontmatter: Record<string, unknown>
): Record<string, unknown> {
  return {
    name,
    title,
    description,
    body,
    frontmatter,
    arguments: [],
    visibility: 'tenant',
    enabled: true,
  };
}

function recipe(name: string, alias: string, params: Record<string, unknown>, note: string) {
  return { name, alias, params, note };
}

function bookmark(alias: string, label: string, note: string) {
  return { alias, label, note };
}

function fact(scope: string, content: string) {
  return { scope, content };
}

export const BUILTIN_SKILL_PACKS: readonly BuiltInSkillPackDefinition[] = [
  {
    id: 'inbox-triage',
    title: 'Inbox triage',
    description: 'Mail triage workflow with recipe, bookmark, and fact seeds.',
    pack: {
      manifest: {
        id: 'inbox-triage',
        name: 'Inbox triage',
        version: 1,
        skills: ['inbox-triage-review'],
        recipes: ['inbox-triage-unread'],
        bookmarks: ['mail.inbox'],
        facts: ['mail-triage'],
      },
      skills: [
        skill(
          'inbox-triage-review',
          'Inbox triage review',
          'Summarize unread mail and propose safe next actions.',
          'Review unread high-priority mail, group by sender and deadline, then suggest reply drafts without sending.',
          {
            tags: ['mail', 'triage'],
            tools: ['list-mail-messages'],
            recipes: ['inbox-triage-unread'],
            bookmarks: ['mail.inbox'],
            facts: ['mail-triage'],
            risk: 'low',
          }
        ),
      ],
      recipes: [
        recipe(
          'inbox-triage-unread',
          'list-mail-messages',
          { top: 25 },
          'Unread inbox triage query.'
        ),
      ],
      bookmarks: [bookmark('list-mail-messages', 'mail.inbox', 'Primary mail triage entrypoint.')],
      facts: [
        fact(
          'mail-triage',
          'Never send or delete mail during triage without explicit user confirmation.'
        ),
      ],
    },
  },
  {
    id: 'meeting-prep',
    title: 'Meeting prep',
    description: 'Calendar and file context workflow for upcoming meetings.',
    pack: {
      manifest: {
        id: 'meeting-prep',
        name: 'Meeting prep',
        version: 1,
        skills: ['meeting-prep-brief'],
        recipes: ['meeting-prep-events'],
        bookmarks: ['calendar.upcoming'],
        facts: ['meeting-prep'],
      },
      skills: [
        skill(
          'meeting-prep-brief',
          'Meeting prep brief',
          'Build a meeting brief from calendar context.',
          'List upcoming meetings, identify attendees and agenda hints, then produce a concise preparation brief.',
          {
            tags: ['calendar', 'meetings'],
            tools: ['list-calendar-events'],
            recipes: ['meeting-prep-events'],
            bookmarks: ['calendar.upcoming'],
            facts: ['meeting-prep'],
            risk: 'low',
          }
        ),
      ],
      recipes: [
        recipe(
          'meeting-prep-events',
          'list-calendar-events',
          { top: 10 },
          'Upcoming calendar events.'
        ),
      ],
      bookmarks: [
        bookmark('list-calendar-events', 'calendar.upcoming', 'Upcoming meeting context.'),
      ],
      facts: [
        fact(
          'meeting-prep',
          'Prefer read-only meeting preparation unless user asks to update calendar data.'
        ),
      ],
    },
  },
  {
    id: 'teams-digest',
    title: 'Teams digest',
    description: 'Teams channel recap workflow.',
    pack: {
      manifest: {
        id: 'teams-digest',
        name: 'Teams digest',
        version: 1,
        skills: ['teams-digest-review'],
        recipes: ['teams-digest-messages'],
        bookmarks: ['teams.digest'],
        facts: ['teams-digest'],
      },
      skills: [
        skill(
          'teams-digest-review',
          'Teams digest review',
          'Summarize recent Teams channel activity.',
          'Collect recent Teams messages, group decisions and blockers, and produce a digest with links for follow-up.',
          {
            tags: ['teams', 'digest'],
            tools: ['list-channel-messages'],
            recipes: ['teams-digest-messages'],
            bookmarks: ['teams.digest'],
            facts: ['teams-digest'],
            risk: 'low',
          }
        ),
      ],
      recipes: [
        recipe(
          'teams-digest-messages',
          'list-channel-messages',
          { top: 50 },
          'Recent Teams messages.'
        ),
      ],
      bookmarks: [bookmark('list-channel-messages', 'teams.digest', 'Teams digest source.')],
      facts: [
        fact(
          'teams-digest',
          'Teams summaries should preserve attribution and avoid fabricating decisions.'
        ),
      ],
    },
  },
  {
    id: 'file-discovery',
    title: 'File discovery',
    description: 'OneDrive and SharePoint file finding workflow.',
    pack: {
      manifest: {
        id: 'file-discovery',
        name: 'File discovery',
        version: 1,
        skills: ['file-discovery-search'],
        recipes: ['file-discovery-query'],
        bookmarks: ['files.search'],
        facts: ['file-discovery'],
      },
      skills: [
        skill(
          'file-discovery-search',
          'File discovery search',
          'Find relevant files with cautious sharing assumptions.',
          'Search files by user-provided query, summarize likely matches, and call out permissions-sensitive documents.',
          {
            tags: ['files', 'search'],
            tools: ['search-drive-items'],
            recipes: ['file-discovery-query'],
            bookmarks: ['files.search'],
            facts: ['file-discovery'],
            risk: 'low',
          }
        ),
      ],
      recipes: [
        recipe('file-discovery-query', 'search-drive-items', { top: 25 }, 'File search query.'),
      ],
      bookmarks: [bookmark('search-drive-items', 'files.search', 'File discovery entrypoint.')],
      facts: [
        fact(
          'file-discovery',
          'Treat file search results as permission-sensitive and avoid broad sharing advice.'
        ),
      ],
    },
  },
  {
    id: 'permissions-security-review',
    title: 'Permissions security review',
    description: 'Read-only permissions review workflow.',
    pack: {
      manifest: {
        id: 'permissions-security-review',
        name: 'Permissions security review',
        version: 1,
        skills: ['permissions-review'],
        recipes: ['permissions-review-groups'],
        bookmarks: ['security.permissions'],
        facts: ['permissions-review'],
      },
      skills: [
        skill(
          'permissions-review',
          'Permissions review',
          'Review high-risk Microsoft 365 permissions.',
          'Inspect groups, app grants, and sharing posture, then produce findings with no remediation actions unless explicitly approved.',
          {
            tags: ['security', 'permissions'],
            tools: ['list-groups'],
            recipes: ['permissions-review-groups'],
            bookmarks: ['security.permissions'],
            facts: ['permissions-review'],
            risk: 'medium',
          }
        ),
      ],
      recipes: [
        recipe(
          'permissions-review-groups',
          'list-groups',
          { top: 50 },
          'Group inventory for permission review.'
        ),
      ],
      bookmarks: [bookmark('list-groups', 'security.permissions', 'Security review inventory.')],
      facts: [
        fact(
          'permissions-review',
          'Permission changes require explicit administrator confirmation and audit context.'
        ),
      ],
    },
  },
  {
    id: 'tenant-onboarding',
    title: 'Tenant onboarding',
    description: 'Tenant setup and validation workflow.',
    pack: {
      manifest: {
        id: 'tenant-onboarding',
        name: 'Tenant onboarding',
        version: 1,
        skills: ['tenant-onboarding-checklist'],
        recipes: ['tenant-onboarding-tools'],
        bookmarks: ['tenant.onboarding'],
        facts: ['tenant-onboarding'],
      },
      skills: [
        skill(
          'tenant-onboarding-checklist',
          'Tenant onboarding checklist',
          'Guide tenant onboarding checks.',
          'Verify tenant configuration, enabled tools, auth mode, and safe defaults before broad user rollout.',
          {
            tags: ['tenant', 'onboarding'],
            tools: ['search-tools'],
            recipes: ['tenant-onboarding-tools'],
            bookmarks: ['tenant.onboarding'],
            facts: ['tenant-onboarding'],
            risk: 'medium',
          }
        ),
      ],
      recipes: [
        recipe(
          'tenant-onboarding-tools',
          'search-tools',
          { query: 'tenant auth tools' },
          'Discover onboarding tools.'
        ),
      ],
      bookmarks: [bookmark('search-tools', 'tenant.onboarding', 'Tenant onboarding discovery.')],
      facts: [
        fact(
          'tenant-onboarding',
          'Tenant onboarding must keep tokens, audit logs, and enabled tools scoped by tenantId.'
        ),
      ],
    },
  },
  {
    id: 'admin-operations',
    title: 'Admin operations',
    description: 'Admin operations workflow with confirmation guidance.',
    pack: {
      manifest: {
        id: 'admin-operations',
        name: 'Admin operations',
        version: 1,
        skills: ['admin-operations-review'],
        recipes: ['admin-operations-audit'],
        bookmarks: ['admin.operations'],
        facts: ['admin-operations'],
      },
      skills: [
        skill(
          'admin-operations-review',
          'Admin operations review',
          'Prepare admin operations with explicit safety checks.',
          'Review requested admin operation, identify blast radius, require confirmation for changes, and record audit-relevant context.',
          {
            tags: ['admin', 'operations'],
            tools: ['list-audit-events'],
            recipes: ['admin-operations-audit'],
            bookmarks: ['admin.operations'],
            facts: ['admin-operations'],
            risk: 'high',
          }
        ),
      ],
      recipes: [
        recipe(
          'admin-operations-audit',
          'list-audit-events',
          { top: 25 },
          'Recent admin audit context.'
        ),
      ],
      bookmarks: [
        bookmark('list-audit-events', 'admin.operations', 'Admin operations audit context.'),
      ],
      facts: [
        fact(
          'admin-operations',
          'Admin operations with shared-state impact require explicit confirmation before action.'
        ),
      ],
    },
  },
];

export function listBuiltInSkillPacks(): BuiltInSkillPackSummary[] {
  return BUILTIN_SKILL_PACKS.map(({ id, title, description }) => ({ id, title, description }));
}

export function getBuiltInSkillPack(id: string): Record<string, unknown> | undefined {
  const pack = BUILTIN_SKILL_PACKS.find((item) => item.id === id)?.pack;
  return pack ? (structuredClone(pack) as Record<string, unknown>) : undefined;
}
