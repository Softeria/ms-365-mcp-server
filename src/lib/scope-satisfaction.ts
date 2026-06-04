const SCOPE_HIERARCHY: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'Mail.ReadWrite': ['Mail.Read'],
  'Calendars.ReadWrite': ['Calendars.Read'],
  'Files.ReadWrite': ['Files.Read'],
  'Tasks.ReadWrite': ['Tasks.Read'],
  'Contacts.ReadWrite': ['Contacts.Read'],
});

function impliedReadAllScope(scope: string): string | null {
  return scope.endsWith('.ReadWrite.All') ? scope.replace(/\.ReadWrite\.All$/, '.Read.All') : null;
}

/**
 * Returns whether a tenant-allowed scope grants the required scope.
 * Mirrors auth scope collapsing without importing MSAL-heavy auth modules.
 */
export function tenantScopeSatisfies(
  allowedScopes: readonly string[],
  requiredScope: string
): boolean {
  for (const allowedScope of allowedScopes) {
    if (allowedScope === requiredScope) return true;
    if (SCOPE_HIERARCHY[allowedScope]?.includes(requiredScope)) return true;
    if (impliedReadAllScope(allowedScope) === requiredScope) return true;
  }
  return false;
}
