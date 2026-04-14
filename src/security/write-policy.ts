/**
 * Read-first access policy. By default both mail writes and calendar
 * writes are off; the operator opts in with --enable-send / --enable-write.
 * This module is the single source of truth for mapping a tool alias to
 * the flag that gates it, so auth.ts (scope building) and graph-tools.ts
 * (tool registration) stay in sync.
 */

export interface WritePolicy {
  /** Allow Mail.Send + Mail.ReadWrite scopes and the tools that depend
   *  on them (send-mail, reply-*, create/delete folders, rules, etc.). */
  mail: boolean;
  /** Allow Calendars.ReadWrite and the tools that depend on it
   *  (create/update/delete calendar events and calendars). */
  calendar: boolean;
}

export const READ_ONLY_POLICY: WritePolicy = {
  mail: false,
  calendar: false,
};

/**
 * Returns whether a given tool — identified by alias and HTTP method —
 * should be registered / have its scopes requested under the current
 * policy. GETs always pass; non-GETs require the matching flag.
 */
export function isToolAllowedByPolicy(
  toolAlias: string,
  method: string,
  policy: WritePolicy
): boolean {
  if (method.toUpperCase() === 'GET') {
    return true;
  }
  if (/calendar|event/i.test(toolAlias)) {
    return policy.calendar;
  }
  if (/mail|message|attachment|folder|rule|mailbox/i.test(toolAlias)) {
    return policy.mail;
  }
  // Tools that are neither mail nor calendar are unexpected in this fork;
  // default-deny.
  return false;
}
