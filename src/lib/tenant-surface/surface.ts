import type { TenantRow } from '../tenant/tenant-row.js';
import { DISCOVERY_V1_OPS } from '../../presets/generated-index.js';

export const DISCOVERY_PRESET_VERSION = 'discovery-v1';
export const DISCOVERY_META_TOOL_NAMES: ReadonlySet<string> = Object.freeze(
  new Set([...DISCOVERY_V1_OPS, 'bulk-action', 'read-bulk-result'])
);

const EMPTY_VISIBLE_TOOLS: ReadonlySet<string> = Object.freeze(new Set<string>());

export interface TenantSurfaceResolution {
  presetVersion?: string;
  visibleToolsSet: ReadonlySet<string>;
  isDiscoverySurface: boolean;
}

export function isDiscoverySurface(
  tenantOrVersion?: Pick<TenantRow, 'preset_version'> | string | null
): boolean {
  const presetVersion =
    typeof tenantOrVersion === 'string' ? tenantOrVersion : tenantOrVersion?.preset_version;
  return presetVersion === DISCOVERY_PRESET_VERSION;
}

export function resolveTenantSurface(
  tenant?: Pick<TenantRow, 'preset_version'> | null
): TenantSurfaceResolution {
  const presetVersion = tenant?.preset_version;
  const discovery = isDiscoverySurface(presetVersion);
  return {
    presetVersion,
    visibleToolsSet: discovery ? DISCOVERY_META_TOOL_NAMES : EMPTY_VISIBLE_TOOLS,
    isDiscoverySurface: discovery,
  };
}
