export interface AuditTargetResource {
  type: string;
  id: string;
}

export interface TargetResourceInput {
  pathPattern?: string;
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

function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
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

function idPlaceholderBase(name: string): string | undefined {
  const base = name.replace(/[-_]?id\d*$/i, '');
  if (base === name || base.length === 0) return undefined;
  return base;
}

export function deriveTargetResource(input: TargetResourceInput): AuditTargetResource | undefined {
  const pathPattern = input.pathPattern;
  if (!pathPattern) return undefined;

  const placeholderPattern = /\{([^}]+)\}|:([A-Za-z][A-Za-z0-9-]*)/g;
  let lastTarget:
    | {
        base: string;
        end: number;
      }
    | undefined;

  for (const match of pathPattern.matchAll(placeholderPattern)) {
    const name = match[1] ?? match[2];
    const base = idPlaceholderBase(name);
    if (!base) continue;
    lastTarget = {
      base,
      end: match.index + match[0].length,
    };
  }

  if (!lastTarget) return undefined;

  const targetPattern = pathPattern.slice(0, lastTarget.end);
  const id = resolveGraphPathForAudit(targetPattern, input.params ?? {});
  if (!id) return undefined;

  return {
    type: toSnakeCase(lastTarget.base),
    id,
  };
}
