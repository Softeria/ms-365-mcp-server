/**
 * Egress guard: pins network traffic to a hardcoded allowlist of Microsoft
 * Graph / MSAL hosts. Any outgoing fetch to another host throws
 * EgressViolationError synchronously; at boot the server is expected to let
 * this bubble up and exit the process. Allowlist entries are matched by
 * exact hostname — no subdomain wildcards, no substring checks.
 */

const ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  'login.microsoftonline.com',
  'graph.microsoft.com',
]);

// Empty string means "default port" (443 for https). Explicit :443 is also fine.
const ALLOWED_PORTS: ReadonlySet<string> = new Set(['', '443']);

export class EgressViolationError extends Error {
  readonly hostname: string;
  readonly url: string;

  constructor(hostname: string, url: string, reason: string) {
    super(`Egress blocked: ${reason} (hostname="${hostname}", url="${url}")`);
    this.name = 'EgressViolationError';
    this.hostname = hostname;
    this.url = url;
  }
}

export function validateUrl(input: string | URL): void {
  let parsed: URL;
  try {
    parsed = typeof input === 'string' ? new URL(input) : input;
  } catch {
    throw new EgressViolationError('', String(input), 'unparseable URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new EgressViolationError(
      parsed.hostname,
      parsed.href,
      `protocol "${parsed.protocol}" is not allowed; only https:`
    );
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new EgressViolationError(
      parsed.hostname,
      parsed.href,
      `hostname not in allowlist (${[...ALLOWED_HOSTS].join(', ')})`
    );
  }

  if (!ALLOWED_PORTS.has(parsed.port)) {
    throw new EgressViolationError(
      parsed.hostname,
      parsed.href,
      `port "${parsed.port}" is not the default https port`
    );
  }
}

const PATCH_MARKER = Symbol.for('@ixtria/outlook-mcp-hardened/egress-guard');

type PatchedFetch = typeof fetch & { [PATCH_MARKER]?: true };

let originalFetch: typeof fetch | null = null;

export function installEgressGuard(): void {
  const current = globalThis.fetch as PatchedFetch | undefined;
  if (current && current[PATCH_MARKER]) {
    return;
  }

  originalFetch = globalThis.fetch;

  const patched = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url =
      input instanceof Request ? input.url : input instanceof URL ? input.href : String(input);
    validateUrl(url);
    if (!originalFetch) {
      throw new Error('Egress guard invariant: originalFetch missing');
    }
    return originalFetch(input, init);
  } as PatchedFetch;

  patched[PATCH_MARKER] = true;
  globalThis.fetch = patched;
}

/** Test-only helper. Restores the fetch implementation that was in place
 *  before installEgressGuard. Safe to call even if the guard was never
 *  installed. */
export function uninstallEgressGuard(): void {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
    originalFetch = null;
  }
}
