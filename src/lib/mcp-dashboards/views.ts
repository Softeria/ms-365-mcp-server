import type { DashboardSlug } from '../mcp-apps/assets.js';

export interface DashboardViewCopy {
  readonly slug: DashboardSlug;
  readonly title: string;
  readonly primaryCta: string;
  readonly emptyHeading: string;
  readonly emptyBody: string;
  readonly loadingText: string;
  readonly errorText: string;
  readonly privacyText: string;
  readonly stateLabels: readonly string[];
}

const EMPTY_BODY =
  'This view has no matching items for the current tenant, account, filters, and enabled tools. Adjust filters or ask for a broader search.';
const ERROR_TEXT =
  'This view could not load safely. Check the required tenant, scopes, enabled tools, and connector capabilities, then retry.';
const PRIVACY_TEXT =
  'This app view contains only server-generated data for the current tenant/session. Tokens and secrets are never included.';

export const DASHBOARD_VIEW_COPY: Readonly<Record<DashboardSlug, DashboardViewCopy>> =
  Object.freeze({
    'inbox-triage': {
      slug: 'inbox-triage',
      title: 'Inbox Triage Dashboard',
      primaryCta: 'Open dashboard',
      emptyHeading: 'No messages need triage',
      emptyBody: EMPTY_BODY,
      loadingText: 'Loading inbox triage...',
      errorText: ERROR_TEXT,
      privacyText: PRIVACY_TEXT,
      stateLabels: ['High priority', 'Unread', 'Suggested action', 'Message resource'],
    },
    'calendar-brief': {
      slug: 'calendar-brief',
      title: 'Calendar Brief Dashboard',
      primaryCta: 'Open dashboard',
      emptyHeading: 'No upcoming events found',
      emptyBody: EMPTY_BODY,
      loadingText: 'Loading calendar brief...',
      errorText: ERROR_TEXT,
      privacyText: PRIVACY_TEXT,
      stateLabels: ['Conflict warning', 'Attendees summary', 'Prep links', 'Event resource'],
    },
    'teams-digest': {
      slug: 'teams-digest',
      title: 'Teams Digest Dashboard',
      primaryCta: 'Open dashboard',
      emptyHeading: 'No recent Teams activity found',
      emptyBody: EMPTY_BODY,
      loadingText: 'Loading teams digest...',
      errorText: ERROR_TEXT,
      privacyText: PRIVACY_TEXT,
      stateLabels: ['Mentions', 'Unresolved questions', 'Thread resource', 'Truncated data'],
    },
    'file-search': {
      slug: 'file-search',
      title: 'File Search Dashboard',
      primaryCta: 'Open dashboard',
      emptyHeading: 'No files matched this search',
      emptyBody: EMPTY_BODY,
      loadingText: 'Loading file search...',
      errorText: ERROR_TEXT,
      privacyText: PRIVACY_TEXT,
      stateLabels: ['Preview-safe metadata', 'Modified time', 'Owner', 'File resource'],
    },
    'permissions-overview': {
      slug: 'permissions-overview',
      title: 'Permissions Overview Dashboard',
      primaryCta: 'Open dashboard',
      emptyHeading: 'No risky permissions found',
      emptyBody: EMPTY_BODY,
      loadingText: 'Loading permissions overview...',
      errorText: ERROR_TEXT,
      privacyText: PRIVACY_TEXT,
      stateLabels: [
        'High-risk share',
        'Subject resource',
        'Confirmation required',
        'No writes from app',
      ],
    },
    'connector-diagnostics': {
      slug: 'connector-diagnostics',
      title: 'Connector Diagnostics Dashboard',
      primaryCta: 'Run connector doctor',
      emptyHeading: 'No connector diagnostics available',
      emptyBody: EMPTY_BODY,
      loadingText: 'Loading connector diagnostics...',
      errorText: ERROR_TEXT,
      privacyText: PRIVACY_TEXT,
      stateLabels: [
        'Expected display name',
        'Metadata URLs',
        'Capability matrix',
        'Disabled reasons',
      ],
    },
    'skill-editor': {
      slug: 'skill-editor',
      title: 'Skill Editor Dashboard',
      primaryCta: 'Save skill',
      emptyHeading: 'No custom skills yet',
      emptyBody: EMPTY_BODY,
      loadingText: 'Loading skill editor...',
      errorText: ERROR_TEXT,
      privacyText: PRIVACY_TEXT,
      stateLabels: [
        'Built-in skill',
        'Tenant custom skill',
        'User personal skill',
        'Forked built-in',
        'Draft with invalid references',
        'Published invalid save attempt',
        'High-risk skill',
        'Delete skill: This disables the custom skill for this tenant or user. Built-in skills cannot be deleted. Confirm the skill name to continue.',
      ],
    },
  });

export function getDashboardViewCopy(slug: DashboardSlug): DashboardViewCopy {
  return DASHBOARD_VIEW_COPY[slug];
}
