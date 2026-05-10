export type ResourceUpdateSource =
  | 'skill'
  | 'memory'
  | 'audit'
  | 'graph-webhook'
  | 'delta'
  | 'admin';

export interface ResourceUpdate {
  readonly uri: string;
  readonly source: ResourceUpdateSource;
  readonly reason?: string;
  readonly changeType?: string;
}

export function tenantResourceUris(tenantId: string, path: string): string[] {
  return [`m365://tenant/${tenantId}/${path}`, `mcp://tenant/${tenantId}/${path}`];
}

export function skillResourceUris(tenantId: string, name?: string): string[] {
  return [
    ...tenantResourceUris(tenantId, 'skills/index.json'),
    ...(name
      ? [
          ...tenantResourceUris(tenantId, `skills/${name}.md`),
          ...tenantResourceUris(tenantId, `skills/${name}.schema.json`),
        ]
      : []),
  ];
}

export function memoryResourceUris(
  tenantId: string,
  kind: 'bookmarks' | 'recipes' | 'facts'
): string[] {
  return tenantResourceUris(tenantId, `${kind}.json`);
}

export function auditResourceUris(tenantId: string): string[] {
  return tenantResourceUris(tenantId, 'audit/recent.json');
}

export function graphResourceUri(tenantId: string, path: string): string {
  return `m365://tenant/${tenantId}/${path.replace(/^\/+/, '')}`;
}
