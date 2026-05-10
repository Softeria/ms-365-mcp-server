export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export interface AppCspMetadata {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  connectSrc: string[];
  frameAncestors: string[];
  baseUri: string[];
  formAction: string[];
}

const FORBIDDEN_MARKERS = ['access_token', 'refresh_token', 'client_secret', '.env'] as const;
const EXTERNAL_SCRIPT_RE = /<script\b[^>]*\bsrc\s*=\s*["']?https?:\/\//i;

export const APP_MIME_TYPE = 'text/html;profile=mcp-app';

export const APP_CSP: AppCspMetadata = Object.freeze({
  defaultSrc: Object.freeze(["'none'"]) as unknown as string[],
  scriptSrc: Object.freeze(["'self'"]) as unknown as string[],
  styleSrc: Object.freeze(["'self'", "'unsafe-inline'"]) as unknown as string[],
  imgSrc: Object.freeze(["'self'", 'data:']) as unknown as string[],
  connectSrc: Object.freeze(["'self'"]) as unknown as string[],
  frameAncestors: Object.freeze(["'none'"]) as unknown as string[],
  baseUri: Object.freeze(["'none'"]) as unknown as string[],
  formAction: Object.freeze(["'none'"]) as unknown as string[],
});

export const APP_UI_META = Object.freeze({
  ui: Object.freeze({
    csp: APP_CSP,
    sandbox: 'allow-scripts',
  }),
});

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
