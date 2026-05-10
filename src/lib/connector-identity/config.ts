import { z } from 'zod';

export const CONNECTOR_CANONICAL_NAME = 'Microsoft365MCP';
export const CONNECTOR_DEFAULT_DISPLAY_NAME = 'Microsoft 365 MCP Gateway';
export const CONNECTOR_DEFAULT_SHORT_NAME = 'Microsoft 365';
export const CONNECTOR_DEFAULT_DESCRIPTION =
  'Enterprise Microsoft 365 MCP gateway for governed Graph access across tenants.';
export const CONNECTOR_SLUG = 'ms-365-mcp-server';
export const CONNECTOR_PACKAGE = '@softeria/ms-365-mcp-server';

export const CONNECTOR_IDENTITY_ENV = [
  'MS365_MCP_CONNECTOR_NAME',
  'MS365_MCP_CONNECTOR_SHORT_NAME',
  'MS365_MCP_CONNECTOR_DESCRIPTION',
  'MS365_MCP_CONNECTOR_ICON_URL',
  'MS365_MCP_CONNECTOR_PRIVACY_URL',
  'MS365_MCP_CONNECTOR_TERMS_URL',
] as const;

export interface ConnectorIdentityInput {
  version: string;
  tenantDisplayName?: string | null;
}

export interface ConnectorIdentity {
  name: typeof CONNECTOR_CANONICAL_NAME;
  displayName: string;
  baseDisplayName: string;
  shortName: string;
  description: string;
  slug: typeof CONNECTOR_SLUG;
  packageName: typeof CONNECTOR_PACKAGE;
  version: string;
  iconUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
  tenantDisplayName?: string;
  operatorConfigured: {
    displayName: boolean;
    shortName: boolean;
    description: boolean;
    iconUrl: boolean;
    privacyUrl: boolean;
    termsUrl: boolean;
  };
}

const OptionalHttpsUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => new URL(value).protocol === 'https:', 'must be an HTTPS URL');

function envString(name: string, fallback: string): { value: string; configured: boolean } {
  const raw = process.env[name];
  const value = raw?.trim();
  if (!value) return { value: fallback, configured: false };
  return { value, configured: true };
}

function optionalHttpsEnv(name: string): { value?: string; configured: boolean } {
  const raw = process.env[name]?.trim();
  if (!raw) return { configured: false };
  const parsed = OptionalHttpsUrl.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${name} must be an HTTPS URL`);
  }
  return { value: parsed.data.replace(/\/$/, ''), configured: true };
}

function sanitizeTenantDisplayName(value: string | null | undefined): string | undefined {
  const cleaned = value
    ?.split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : char;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, 80);
}

export function resolveConnectorIdentity(input: ConnectorIdentityInput): ConnectorIdentity {
  const display = envString('MS365_MCP_CONNECTOR_NAME', CONNECTOR_DEFAULT_DISPLAY_NAME);
  const short = envString('MS365_MCP_CONNECTOR_SHORT_NAME', CONNECTOR_DEFAULT_SHORT_NAME);
  const description = envString('MS365_MCP_CONNECTOR_DESCRIPTION', CONNECTOR_DEFAULT_DESCRIPTION);
  const icon = optionalHttpsEnv('MS365_MCP_CONNECTOR_ICON_URL');
  const privacy = optionalHttpsEnv('MS365_MCP_CONNECTOR_PRIVACY_URL');
  const terms = optionalHttpsEnv('MS365_MCP_CONNECTOR_TERMS_URL');
  const tenantDisplayName = sanitizeTenantDisplayName(input.tenantDisplayName);
  const displayName = tenantDisplayName ? `${display.value} - ${tenantDisplayName}` : display.value;

  return {
    name: CONNECTOR_CANONICAL_NAME,
    displayName,
    baseDisplayName: display.value,
    shortName: short.value,
    description: description.value,
    slug: CONNECTOR_SLUG,
    packageName: CONNECTOR_PACKAGE,
    version: input.version,
    ...(icon.value ? { iconUrl: icon.value } : {}),
    ...(privacy.value ? { privacyUrl: privacy.value } : {}),
    ...(terms.value ? { termsUrl: terms.value } : {}),
    ...(tenantDisplayName ? { tenantDisplayName } : {}),
    operatorConfigured: {
      displayName: display.configured,
      shortName: short.configured,
      description: description.configured,
      iconUrl: icon.configured,
      privacyUrl: privacy.configured,
      termsUrl: terms.configured,
    },
  };
}
