export interface AuditTargetResource {
  type: string;
  id: string;
}

export interface TargetResourceInput {
  pathPattern?: string;
  resolvedPath?: string;
  params?: Record<string, unknown>;
}

const CONTROL_PARAM_NAMES = new Set([
  'account',
  'confirm',
  'fetchAllPages',
  'includeHeaders',
  'excludeResponse',
  'timezone',
  'expandExtendedProperties',
]);

function toCamelCase(name: string): string {
  return name.replace(/-([a-zA-Z])/g, (_, c: string) => c.toUpperCase());
}

function toKebabCase(name: string): string {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

function valueForPlaceholder(
  placeholderName: string,
  params: Record<string, unknown>
): string | undefined {
  const candidates = [placeholderName, toCamelCase(placeholderName), toKebabCase(placeholderName)];
  for (const candidate of candidates) {
    if (CONTROL_PARAM_NAMES.has(candidate)) continue;
    const value = params[candidate];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return encodeURIComponent(String(value)).replace(/%3D/g, '=');
    }
  }
  return undefined;
}

export function resolveGraphPathForAudit(
  pathPattern: string | undefined,
  params: Record<string, unknown> = {}
): string | undefined {
  if (!pathPattern) return undefined;
  let resolvedPath = pathPattern;

  resolvedPath = resolvedPath.replace(/:([A-Za-z][A-Za-z0-9-]*)/g, (match, name: string) => {
    return valueForPlaceholder(name, params) ?? match;
  });
  resolvedPath = resolvedPath.replace(/\{([^}]+)\}/g, (match, name: string) => {
    return valueForPlaceholder(name, params) ?? match;
  });

  if (/:([A-Za-z][A-Za-z0-9-]*)|\{[^}]+\}/.test(resolvedPath)) {
    return undefined;
  }
  return resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;
}

function stripQueryAndFragment(path: string): string {
  return path.split(/[?#]/, 1)[0];
}

function stripTransportEndpoint(path: string): string {
  return path.replace(/\/(?:content|\$value)$/i, '');
}

function normalizePath(path: string): string {
  const withoutQuery = stripQueryAndFragment(path);
  const withoutTransport = stripTransportEndpoint(withoutQuery);
  return withoutTransport.replace(/\/+$/, '') || '/';
}

function typedResource(type: string, path: string): AuditTargetResource {
  return { type, id: normalizePath(path) };
}

export function deriveTargetResource(input: TargetResourceInput): AuditTargetResource | undefined {
  const candidatePath =
    input.resolvedPath ?? resolveGraphPathForAudit(input.pathPattern, input.params ?? {});
  if (!candidatePath || !candidatePath.startsWith('/')) return undefined;

  const path = normalizePath(candidatePath);
  const lowerPath = path.toLowerCase();

  if (
    /^\/(?:chats\/[^/]+\/messages\/[^/]+|teams\/[^/]+\/channels\/[^/]+\/messages\/[^/]+)\/hostedcontents\/[^/]+$/.test(
      lowerPath
    )
  ) {
    return typedResource('teams_hosted_content', path);
  }

  if (/^\/(?:me|users\/[^/]+)\/messages\/[^/]+\/attachments\/[^/]+$/.test(lowerPath)) {
    return typedResource('mail_attachment', path);
  }

  if (/^\/(?:me|users\/[^/]+|groups\/[^/]+|sites\/[^/]+)\/onenote\/pages\/[^/]+$/.test(lowerPath)) {
    return typedResource('onenote_page', path);
  }

  if (/^\/planner\/tasks\/[^/]+$/.test(lowerPath)) {
    return typedResource('planner_task', path);
  }

  const driveItemPath = path.match(
    /^(\/(?:drives\/[^/]+\/items\/[^/]+|(?:me|users\/[^/]+|groups\/[^/]+|sites\/[^/]+)\/drive\/items\/[^/]+|(?:groups\/[^/]+|sites\/[^/]+)\/drives\/[^/]+\/items\/[^/]+))(?:\/.*)?$/i
  )?.[1];
  if (driveItemPath) {
    return typedResource('drive_item', driveItemPath);
  }

  const driveItemByPath = path.match(
    /^(\/(?:drives\/[^/]+\/root:\/.+:|(?:me|users\/[^/]+|groups\/[^/]+|sites\/[^/]+)\/drive\/root:\/.+:|(?:groups\/[^/]+|sites\/[^/]+)\/drives\/[^/]+\/root:\/.+:))(?:\/.*)?$/i
  )?.[1];
  if (driveItemByPath) {
    return typedResource('drive_item', driveItemByPath);
  }

  if (/^\/sites\/[^/]+\/lists\/[^/]+\/items\/[^/]+$/.test(lowerPath)) {
    return typedResource('sharepoint_list_item', path);
  }

  if (/^\/sites\/[^/]+\/lists\/[^/]+$/.test(lowerPath)) {
    return typedResource('sharepoint_list', path);
  }

  if (/^\/(?:sites\/[^/]+\/drives\/[^/]+|drives\/[^/]+)$/.test(lowerPath)) {
    return typedResource('sharepoint_drive', path);
  }

  if (/^\/sites\/[^/]+(?::\/.*)?$/.test(lowerPath)) {
    return typedResource('sharepoint_site', path);
  }

  if (/^\/(?:me|users\/[^/]+)\/photo$/.test(lowerPath)) {
    return typedResource('profile_photo', path);
  }

  return undefined;
}
