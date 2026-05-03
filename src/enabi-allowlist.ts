/**
 * Enabi runtime tool allowlist.
 *
 * Belt-and-suspenders defense: even if endpoints.json drifts during an upstream
 * sync, only tool names listed here will be registered with the MCP server.
 * Anything else fails loud at startup.
 *
 * To add a tool:
 *   1. Verify it is mail/calendar/contacts (Enabi's defined scope).
 *   2. Add the toolName to ALLOWED_TOOLS below.
 *   3. Add the entry to src/endpoints.json (or auth-tools.ts).
 *   4. Update docs/CAPABILITY_BASELINE.json so CI passes.
 *   5. Justify the addition in the PR description.
 */

export const ALLOWED_TOOLS: ReadonlySet<string> = new Set([
  // --- Auth (registered in auth-tools.ts) ---
  'login',
  'logout',
  'verify-login',
  'list-accounts',
  'select-account',
  'remove-account',

  // --- Identity ---
  'get-current-user',

  // --- Mail (personal mailbox) ---
  'add-mail-attachment',
  'copy-mail-message',
  'create-draft-email',
  'create-focused-inbox-override',
  'create-forward-draft',
  'create-mail-attachment-upload-session',
  'create-mail-child-folder',
  'create-mail-folder',
  'create-mail-rule',
  'create-reply-all-draft',
  'create-reply-draft',
  'delete-focused-inbox-override',
  'delete-mail-attachment',
  'delete-mail-folder',
  'delete-mail-message',
  'delete-mail-rule',
  'forward-mail-message',
  'get-mail-attachment',
  'get-mail-message',
  'get-mailbox-settings',
  'list-focused-inbox-overrides',
  'list-mail-attachments',
  'list-mail-child-folders',
  'list-mail-folder-messages',
  'list-mail-folder-messages-delta',
  'list-mail-folders',
  'list-mail-messages',
  'list-mail-rules',
  'move-mail-message',
  'reply-all-mail-message',
  'reply-mail-message',
  'send-draft-message',
  'send-mail',
  'update-focused-inbox-override',
  'update-mail-folder',
  'update-mail-message',
  'update-mail-rule',
  'update-mailbox-settings',

  // --- Shared mailbox (READ ONLY; sending from shared mailbox is intentionally NOT exposed) ---
  'get-shared-mailbox-message',
  'list-shared-mailbox-folder-messages',
  'list-shared-mailbox-messages',

  // --- Calendar (personal; shared calendars / find-meeting-times intentionally excluded) ---
  'accept-calendar-event',
  'cancel-calendar-event',
  'create-calendar',
  'create-calendar-event',
  'create-specific-calendar-event',
  'decline-calendar-event',
  'delete-calendar',
  'delete-calendar-event',
  'delete-specific-calendar-event',
  'dismiss-calendar-event-reminder',
  'forward-calendar-event',
  'get-calendar-event',
  'get-calendar-view',
  'get-specific-calendar-event',
  'get-specific-calendar-view',
  'list-calendar-event-instances',
  'list-calendar-events',
  'list-calendar-events-delta',
  'list-calendar-view-delta',
  'list-calendars',
  'list-specific-calendar-events',
  'snooze-calendar-event-reminder',
  'tentatively-accept-calendar-event',
  'update-calendar',
  'update-calendar-event',
  'update-specific-calendar-event',

  // --- Contacts ---
  'create-outlook-contact',
  'delete-outlook-contact',
  'get-outlook-contact',
  'list-outlook-contacts',
  'update-outlook-contact',

  // --- Outlook categories (used to label mail) ---
  'list-outlook-categories',
  'create-outlook-category',
]);

/**
 * Test-only escape hatch.
 *
 * Several unit tests register synthetic tool aliases (e.g. "test-tool",
 * "list-excel-worksheets" used as a stand-in) to exercise registration logic
 * without depending on the real endpoints.json. Production code must NEVER
 * set this — it is gated behind an env var that we never set in production
 * builds, and is only flipped on inside vitest setup.
 */
export function isAllowed(toolName: string): boolean {
  if (process.env.ENABI_ALLOWLIST_BYPASS === '1') return true;
  return ALLOWED_TOOLS.has(toolName);
}

/**
 * The minimum scope set Enabi will request at OAuth login.
 * This is asserted at startup against scopes derived from endpoints.json.
 * Mismatch = startup failure.
 */
export const ENABI_REQUIRED_SCOPES: readonly string[] = [
  'User.Read',
  'Mail.ReadWrite', // subsumes Mail.Read
  'Mail.Send',
  'Mail.Read.Shared',
  'MailboxSettings.ReadWrite', // subsumes MailboxSettings.Read
  'Calendars.ReadWrite', // subsumes Calendars.Read
  'Contacts.ReadWrite', // subsumes Contacts.Read
];
