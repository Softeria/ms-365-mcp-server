export type CapabilityName =
  | 'tools'
  | 'resources'
  | 'prompts'
  | 'completions'
  | 'logging'
  | 'resourceSubscriptions'
  | 'progress'
  | 'cancellation'
  | 'sampling'
  | 'elicitation'
  | 'roots'
  | 'apps'
  | 'structuredToolResults';

export type McpTransportKind = 'streamable-http' | 'legacy-sse' | 'stdio';
export type McpSurfaceMode = 'discovery' | 'static';

export interface ClientInfo {
  name?: string;
  version?: string;
}

export type AdvertisedCapabilities = Record<string, unknown>;
export type ServerCapabilityMap = Readonly<Record<CapabilityName, boolean>>;

export interface TenantCapabilityPolicy {
  phase8Enabled: boolean;
  enabled?: Partial<Record<CapabilityName, boolean>>;
}

export interface BuildCapabilityProfileInput {
  protocolVersion?: string;
  clientInfo?: ClientInfo;
  advertisedCapabilities?: AdvertisedCapabilities;
  transport: McpTransportKind;
  surface: McpSurfaceMode;
  tenantPolicy: TenantCapabilityPolicy;
  serverCapabilities?: ServerCapabilityMap;
}

export interface CapabilityGate {
  name: CapabilityName;
  advertised: boolean;
  serverSupported: boolean;
  tenantAllowed: boolean;
  transportSupported: boolean;
  effective: boolean;
  disabledReason?: string;
}

export interface ClientCapabilityProfile {
  protocolVersion?: string;
  clientInfo?: ClientInfo;
  transport: McpTransportKind;
  surface: McpSurfaceMode;
  phase8Enabled: boolean;
  capabilities: Readonly<Record<CapabilityName, CapabilityGate>>;
  enabledFeatures: readonly CapabilityName[];
  disabledFeatures: readonly CapabilityGate[];
  fallbacks: readonly string[];
}

const CAPABILITY_NAMES: readonly CapabilityName[] = [
  'tools',
  'resources',
  'prompts',
  'completions',
  'logging',
  'resourceSubscriptions',
  'progress',
  'cancellation',
  'sampling',
  'elicitation',
  'roots',
  'apps',
  'structuredToolResults',
];

const PHASE8_CAPABILITIES = new Set<CapabilityName>([
  'resources',
  'prompts',
  'completions',
  'logging',
  'resourceSubscriptions',
  'progress',
  'cancellation',
  'sampling',
  'elicitation',
  'roots',
  'apps',
]);

const CLIENT_ADVERTISED_CAPABILITIES = new Set<CapabilityName>([
  'resources',
  'prompts',
  'completions',
  'logging',
  'resourceSubscriptions',
  'progress',
  'cancellation',
  'sampling',
  'elicitation',
  'roots',
  'apps',
]);

export const DEFAULT_SERVER_CAPABILITIES: ServerCapabilityMap = Object.freeze({
  tools: true,
  resources: true,
  prompts: true,
  completions: true,
  logging: true,
  resourceSubscriptions: true,
  progress: true,
  cancellation: true,
  sampling: true,
  elicitation: true,
  roots: true,
  apps: true,
  structuredToolResults: true,
});

const TRANSPORT_SUPPORT: Readonly<Record<McpTransportKind, ReadonlySet<CapabilityName>>> =
  Object.freeze({
    'streamable-http': new Set(CAPABILITY_NAMES.filter((name) => name !== 'roots')),
    stdio: new Set(
      CAPABILITY_NAMES.filter((name) => name !== 'apps' && name !== 'resourceSubscriptions')
    ),
    'legacy-sse': new Set<CapabilityName>(['tools', 'structuredToolResults']),
  });

export function buildEffectiveCapabilityProfile(
  input: BuildCapabilityProfileInput
): ClientCapabilityProfile {
  const advertised = input.advertisedCapabilities ?? {};
  const serverCapabilities = input.serverCapabilities ?? DEFAULT_SERVER_CAPABILITIES;
  const gates = CAPABILITY_NAMES.map((name) =>
    Object.freeze(buildGate(name, input, advertised, serverCapabilities))
  );
  const capabilities = Object.freeze(
    Object.fromEntries(gates.map((gate) => [gate.name, gate])) as Record<
      CapabilityName,
      CapabilityGate
    >
  );
  const enabledFeatures = Object.freeze(
    gates.filter((gate) => gate.effective).map((gate) => gate.name)
  );
  const disabledFeatures = Object.freeze(gates.filter((gate) => !gate.effective));
  const fallbacks = Object.freeze(buildFallbacks(input, disabledFeatures));

  return Object.freeze({
    protocolVersion: input.protocolVersion,
    clientInfo: input.clientInfo ? Object.freeze({ ...input.clientInfo }) : undefined,
    transport: input.transport,
    surface: input.surface,
    phase8Enabled: input.tenantPolicy.phase8Enabled,
    capabilities,
    enabledFeatures,
    disabledFeatures,
    fallbacks,
  });
}

function buildGate(
  name: CapabilityName,
  input: BuildCapabilityProfileInput,
  advertised: AdvertisedCapabilities,
  serverCapabilities: ServerCapabilityMap
): CapabilityGate {
  const serverSupported = serverCapabilities[name] === true;
  const transportSupported = TRANSPORT_SUPPORT[input.transport].has(name);
  const tenantAllowed = isTenantAllowed(name, input.tenantPolicy);
  const isAdvertised = isCapabilityAdvertised(name, advertised);
  const effective = serverSupported && transportSupported && tenantAllowed && isAdvertised;
  const disabledReason = effective
    ? undefined
    : disabledReasonFor({ name, serverSupported, transportSupported, tenantAllowed, isAdvertised });

  return {
    name,
    advertised: isAdvertised,
    serverSupported,
    tenantAllowed,
    transportSupported,
    effective,
    ...(disabledReason ? { disabledReason } : {}),
  };
}

function isTenantAllowed(name: CapabilityName, policy: TenantCapabilityPolicy): boolean {
  if (name === 'tools' || name === 'structuredToolResults') return true;
  if (!policy.phase8Enabled && PHASE8_CAPABILITIES.has(name)) return false;
  return policy.enabled?.[name] ?? true;
}

function isCapabilityAdvertised(name: CapabilityName, advertised: AdvertisedCapabilities): boolean {
  if (name === 'tools' || name === 'structuredToolResults') return true;
  if (name === 'resourceSubscriptions') {
    const resources = advertised.resources;
    return (
      hasObjectCapability(advertised, 'resourceSubscriptions') ||
      resourceSubscribeEnabled(resources)
    );
  }
  if (!CLIENT_ADVERTISED_CAPABILITIES.has(name)) return true;
  return hasObjectCapability(advertised, name);
}

function hasObjectCapability(advertised: AdvertisedCapabilities, name: string): boolean {
  const value = advertised[name];
  return typeof value === 'object' && value !== null;
}

function resourceSubscribeEnabled(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { subscribe?: unknown }).subscribe === true
  );
}

function disabledReasonFor(input: {
  name: CapabilityName;
  serverSupported: boolean;
  transportSupported: boolean;
  tenantAllowed: boolean;
  isAdvertised: boolean;
}): string {
  if (!input.serverSupported) return `${input.name} disabled because server does not support it`;
  if (!input.tenantAllowed)
    return `${input.name} disabled because Phase 8 disabled by tenant policy`;
  if (!input.isAdvertised) return `${input.name} disabled because client does not advertise it`;
  if (!input.transportSupported)
    return `${input.name} disabled because transport does not support it`;
  return `${input.name} disabled`;
}

function buildFallbacks(
  input: BuildCapabilityProfileInput,
  disabledFeatures: readonly CapabilityGate[]
): readonly string[] {
  const fallbackSet = new Set<string>();
  if (!input.tenantPolicy.phase8Enabled) {
    fallbackSet.add('tool-only discovery loop preserved for Phase 8-disabled tenants');
  }
  if (disabledFeatures.some((gate) => gate.disabledReason?.includes('client does not advertise'))) {
    fallbackSet.add(
      'Your client does not advertise one or more advanced MCP capabilities; text and JSON tool fallbacks remain available.'
    );
  }
  if (
    disabledFeatures.some((gate) => gate.disabledReason?.includes('transport does not support'))
  ) {
    fallbackSet.add(
      `${input.transport} transport exposes only the capabilities it can safely deliver.`
    );
  }
  return [...fallbackSet];
}
