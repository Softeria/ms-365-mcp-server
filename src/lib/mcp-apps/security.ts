export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export interface AppCspMetadata {
  connectDomains: string[];
  resourceDomains: string[];
  baseUriDomains: string[];
}

export interface AppUiMetadata {
  ui: {
    csp: AppCspMetadata;
    sandbox: string;
    prefersBorder: boolean;
    domain?: string;
  };
}

const FORBIDDEN_MARKERS = ['access_token', 'refresh_token', 'client_secret', '.env'] as const;
const EXTERNAL_SCRIPT_RE = /<script\b[^>]*\bsrc\s*=\s*["']?https?:\/\//i;

export const APP_MIME_TYPE = 'text/html;profile=mcp-app';

export const APP_CSP: AppCspMetadata = Object.freeze({
  connectDomains: Object.freeze([]) as unknown as string[],
  resourceDomains: Object.freeze([]) as unknown as string[],
  baseUriDomains: Object.freeze([]) as unknown as string[],
});

export const APP_UI_META: AppUiMetadata = Object.freeze({
  ui: Object.freeze({
    csp: APP_CSP,
    sandbox: 'allow-scripts',
    prefersBorder: true,
    ...appDomainMetadata(),
  }),
});

function appDomainMetadata(): { domain?: string } {
  const raw = process.env.MS365_MCP_APP_DOMAIN ?? process.env.MS365_MCP_PUBLIC_URL;
  if (!raw?.trim()) return {};

  try {
    const parsed = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return {};
    return { domain: parsed.hostname };
  } catch {
    return {};
  }
}

export function sanitizeHtmlSnippet(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function validateAppAssetText(text: string, label: string): ValidationResult {
  const lower = text.toLowerCase();
  const marker = FORBIDDEN_MARKERS.find((candidate) => lower.includes(candidate));
  if (marker) {
    return { ok: false, reason: `${label} contains forbidden marker ${marker}` };
  }

  if (EXTERNAL_SCRIPT_RE.test(text)) {
    return { ok: false, reason: `${label} contains external script URL` };
  }

  return { ok: true };
}

export function assertSecretFreePayload(value: unknown): ValidationResult {
  const json = JSON.stringify(value ?? {});
  if (!json) return { ok: true };
  return validateAppAssetText(json, 'app payload');
}
