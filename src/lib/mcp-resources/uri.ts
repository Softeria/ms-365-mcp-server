import { WORKLOAD_GUIDE_SLUGS, type WorkloadGuideSlug } from './catalog.js';

import type { SkillResourceDescriptor } from '../mcp-skills/resources.js';

export type TenantResourceView =
  | 'enabled-tools'
  | 'scopes'
  | 'audit/recent'
  | 'bookmarks'
  | 'recipes'
  | 'facts';

export type ConnectorResourceView = 'connector/capabilities' | 'connector/diagnostics';

export type GraphBackedResourceKind =
  | 'user'
  | 'group'
  | 'team'
  | 'team-channel'
  | 'site'
  | 'drive-item'
  | 'mail-message'
  | 'calendar-event';

export type ResourceUriErrorCode =
  | 'invalid_scheme'
  | 'invalid_resource_uri'
  | 'tenant_resource_mismatch';

export interface InvalidMcpResourceUri {
  ok: false;
  code: ResourceUriErrorCode;
  message: string;
}

export interface CatalogMcpResourceUri {
  ok: true;
  kind: 'catalog';
  path: 'navigation-guide.md' | 'scope-map.json' | `workloads/${WorkloadGuideSlug}.md`;
  workloadSlug?: WorkloadGuideSlug;
}

export interface EndpointMcpResourceUri {
  ok: true;
  kind: 'endpoint';
  alias: string;
}

export interface TenantMcpResourceUri {
  ok: true;
  kind: 'tenant';
  tenantId: string;
  view: TenantResourceView;
  path:
    | 'enabled-tools.json'
    | 'scopes.json'
    | 'audit/recent.json'
    | 'bookmarks.json'
    | 'recipes.json'
    | 'facts.json';
}

export interface ConnectorMcpResourceUri {
  ok: true;
  kind: 'connector';
  tenantId: string;
  view: ConnectorResourceView;
  path: 'connector/capabilities.json' | 'connector/diagnostics.json';
}

export interface SkillMcpResourceUri {
  ok: true;
  kind: 'skill';
  tenantId: string;
  descriptor: SkillResourceDescriptor;
}

export interface GraphBackedMcpResourceUri {
  ok: true;
  kind: 'graph';
  tenantId: string;
  graphKind: GraphBackedResourceKind;
  ids: Readonly<Record<string, string>>;
  path:
    | `users/${string}.json`
    | `groups/${string}.json`
    | `teams/${string}.json`
    | `teams/${string}/channels/${string}.json`
    | `sites/${string}.json`
    | `drives/${string}/items/${string}.json`
    | `mail/messages/${string}.json`
    | `calendar/events/${string}.json`;
}

export type ValidMcpResourceUri =
  | CatalogMcpResourceUri
  | EndpointMcpResourceUri
  | TenantMcpResourceUri
  | ConnectorMcpResourceUri
  | SkillMcpResourceUri
  | GraphBackedMcpResourceUri;

export type ParsedMcpResourceUri = ValidMcpResourceUri | InvalidMcpResourceUri;

const WORKLOAD_GUIDE_SET: ReadonlySet<string> = Object.freeze(new Set(WORKLOAD_GUIDE_SLUGS));

const TENANT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TENANT_VIEW_BY_PATH: ReadonlyMap<string, TenantResourceView> = Object.freeze(
  new Map<string, TenantResourceView>([
    ['enabled-tools.json', 'enabled-tools'],
    ['scopes.json', 'scopes'],
    ['audit/recent.json', 'audit/recent'],
    ['bookmarks.json', 'bookmarks'],
    ['recipes.json', 'recipes'],
    ['facts.json', 'facts'],
  ])
);

const CONNECTOR_VIEW_BY_PATH: ReadonlyMap<string, ConnectorResourceView> = Object.freeze(
  new Map<string, ConnectorResourceView>([
    ['connector/capabilities.json', 'connector/capabilities'],
    ['connector/diagnostics.json', 'connector/diagnostics'],
  ])
);

interface GraphPattern {
  readonly pattern: RegExp;
  readonly kind: GraphBackedResourceKind;
  readonly ids: (match: RegExpExecArray) => Readonly<Record<string, string>>;
}

const GRAPH_PATTERNS: readonly GraphPattern[] = Object.freeze([
  {
    pattern: /^users\/([^/]+)\.json$/,
    kind: 'user',
    ids: (match) => ({ userId: match[1] }),
  },
  {
    pattern: /^groups\/([^/]+)\.json$/,
    kind: 'group',
    ids: (match) => ({ groupId: match[1] }),
  },
  {
    pattern: /^teams\/([^/]+)\/channels\/([^/]+)\.json$/,
    kind: 'team-channel',
    ids: (match) => ({ teamId: match[1], channelId: match[2] }),
  },
  {
    pattern: /^teams\/([^/]+)\.json$/,
    kind: 'team',
    ids: (match) => ({ teamId: match[1] }),
  },
  {
    pattern: /^sites\/([^/]+)\.json$/,
    kind: 'site',
    ids: (match) => ({ siteId: match[1] }),
  },
  {
    pattern: /^drives\/([^/]+)\/items\/([^/]+)\.json$/,
    kind: 'drive-item',
    ids: (match) => ({ driveId: match[1], itemId: match[2] }),
  },
  {
    pattern: /^mail\/messages\/([^/]+)\.json$/,
    kind: 'mail-message',
    ids: (match) => ({ messageId: match[1] }),
  },
  {
    pattern: /^calendar\/events\/([^/]+)\.json$/,
    kind: 'calendar-event',
    ids: (match) => ({ eventId: match[1] }),
  },
]);

function invalid(code: ResourceUriErrorCode, message: string): InvalidMcpResourceUri {
  return { ok: false, code, message };
}

function decodePathname(url: URL): string | null {
  try {
    return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  } catch {
    return null;
  }
}

function hasNoUrlDecorators(url: URL): boolean {
  return (
    url.username === '' &&
    url.password === '' &&
    url.search === '' &&
    url.hash === '' &&
    url.port === ''
  );
}

function parseCatalogResource(pathname: string): ParsedMcpResourceUri {
  if (pathname === 'navigation-guide.md' || pathname === 'scope-map.json') {
    return { ok: true, kind: 'catalog', path: pathname };
  }

  const match = /^workloads\/([a-z0-9-]+)\.md$/.exec(pathname);
  if (!match) {
    return invalid('invalid_resource_uri', 'Unsupported catalog resource path.');
  }

  const slug = match[1];
  if (!WORKLOAD_GUIDE_SET.has(slug)) {
    return invalid('invalid_resource_uri', 'Unsupported workload guide slug.');
  }

  return {
    ok: true,
    kind: 'catalog',
    path: `workloads/${slug}.md` as `workloads/${WorkloadGuideSlug}.md`,
    workloadSlug: slug as WorkloadGuideSlug,
  };
}

function parseEndpointResource(pathname: string): ParsedMcpResourceUri {
  const suffix = '.schema.json';
  if (!pathname.endsWith(suffix)) {
    return invalid('invalid_resource_uri', 'Endpoint resource must end with .schema.json.');
  }

  const alias = pathname.slice(0, -suffix.length);
  if (alias.length === 0 || alias.includes('/')) {
    return invalid('invalid_resource_uri', 'Endpoint schema alias is invalid.');
  }

  return { ok: true, kind: 'endpoint', alias };
}

function parseConnectorTenantResource(
  tenantId: string,
  resourcePath: string
): ConnectorMcpResourceUri | null {
  const view = CONNECTOR_VIEW_BY_PATH.get(resourcePath);
  if (!view) return null;
  return {
    ok: true,
    kind: 'connector',
    tenantId,
    view,
    path: resourcePath as ConnectorMcpResourceUri['path'],
  };
}

function parseSkillTenantResource(
  tenantId: string,
  resourcePath: string
): SkillMcpResourceUri | InvalidMcpResourceUri | null {
  if (resourcePath === 'skills/index.json') {
    return { ok: true, kind: 'skill', tenantId, descriptor: { view: 'skills/index' } };
  }

  const markdownMatch = /^skills\/([^/]+)\.md$/.exec(resourcePath);
  if (markdownMatch) {
    return {
      ok: true,
      kind: 'skill',
      tenantId,
      descriptor: { view: 'skills/markdown', name: markdownMatch[1] },
    };
  }

  const schemaMatch = /^skills\/([^/]+)\.schema\.json$/.exec(resourcePath);
  if (schemaMatch) {
    return {
      ok: true,
      kind: 'skill',
      tenantId,
      descriptor: { view: 'skills/schema', name: schemaMatch[1] },
    };
  }

  const packMatch = /^skill-packs\/([^/]+)\.json$/.exec(resourcePath);
  if (packMatch) {
    return {
      ok: true,
      kind: 'skill',
      tenantId,
      descriptor: { view: 'skill-pack', packName: packMatch[1] },
    };
  }

  return null;
}

function parseGraphTenantResource(
  tenantId: string,
  resourcePath: string
): GraphBackedMcpResourceUri | null {
  for (const graphPattern of GRAPH_PATTERNS) {
    const match = graphPattern.pattern.exec(resourcePath);
    if (!match) continue;
    return {
      ok: true,
      kind: 'graph',
      tenantId,
      graphKind: graphPattern.kind,
      ids: graphPattern.ids(match),
      path: resourcePath as GraphBackedMcpResourceUri['path'],
    };
  }
  return null;
}

function parseTenantResource(pathname: string): ParsedMcpResourceUri {
  const segments = pathname.split('/');
  const tenantId = segments.shift();
  if (!tenantId || !TENANT_ID_RE.test(tenantId)) {
    return invalid('invalid_resource_uri', 'Tenant resource URI must include a UUID tenant id.');
  }

  const resourcePath = segments.join('/');
  const skillResource = parseSkillTenantResource(tenantId, resourcePath);
  if (skillResource) {
    return skillResource;
  }

  const connectorResource = parseConnectorTenantResource(tenantId, resourcePath);
  if (connectorResource) {
    return connectorResource;
  }

  const graphResource = parseGraphTenantResource(tenantId, resourcePath);
  if (graphResource) {
    return graphResource;
  }

  const view = TENANT_VIEW_BY_PATH.get(resourcePath);
  if (!view) {
    return invalid('invalid_resource_uri', 'Unsupported tenant resource path.');
  }

  return {
    ok: true,
    kind: 'tenant',
    tenantId,
    view,
    path: resourcePath as TenantMcpResourceUri['path'],
  };
}

export function parseMcpResourceUri(raw: string): ParsedMcpResourceUri {
  if (/\/\.{1,2}(?:\/|$)/.test(raw)) {
    return invalid('invalid_resource_uri', 'Resource URI path must not include dot segments.');
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return invalid('invalid_resource_uri', 'Resource URI is not a valid URL.');
  }

  if (url.protocol !== 'm365:' && url.protocol !== 'mcp:') {
    return invalid('invalid_scheme', 'Resource URI must use the m365: or mcp: scheme.');
  }

  if (!hasNoUrlDecorators(url)) {
    return invalid('invalid_resource_uri', 'Resource URI must not include auth, query, or hash.');
  }

  const pathname = decodePathname(url);
  if (!pathname || pathname.includes('..') || pathname.includes('//')) {
    return invalid('invalid_resource_uri', 'Resource URI path is invalid.');
  }

  switch (url.hostname) {
    case 'catalog':
      return parseCatalogResource(pathname);
    case 'endpoint':
      return parseEndpointResource(pathname);
    case 'tenant':
      return parseTenantResource(pathname);
    default:
      return invalid('invalid_resource_uri', 'Unsupported MCP resource host.');
  }
}

export function assertTenantResourceOwner(
  parsed: ParsedMcpResourceUri,
  callerTenantId: string | undefined
): ParsedMcpResourceUri {
  if (
    !parsed.ok ||
    (parsed.kind !== 'tenant' &&
      parsed.kind !== 'skill' &&
      parsed.kind !== 'connector' &&
      parsed.kind !== 'graph')
  ) {
    return parsed;
  }

  if (!callerTenantId || parsed.tenantId !== callerTenantId) {
    return invalid('tenant_resource_mismatch', 'Tenant resource does not belong to caller.');
  }

  return parsed;
}
