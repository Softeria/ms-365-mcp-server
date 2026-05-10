import type { ClientCapabilityProfile, CapabilityName } from './profile.js';
import { getRequestTokens } from '../../request-context.js';
import { confirmationIdFor, type ToolRiskClassification } from '../safe-writes/classifier.js';

const SECRET_KEY_PATTERN = /authorization|cookie|token|secret|password|credential/i;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const TOKEN_VALUE_PATTERN = /\b(?:access|refresh|client)[_-]?token\b\s*[:=]\s*[^\s,;]+/gi;

export interface SamplingRequest {
  readonly messages: readonly Record<string, unknown>[];
  readonly systemPrompt?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly modelPreferences?: Record<string, unknown>;
  readonly fallbackText?: string;
}

export interface SamplingResult {
  readonly ok: boolean;
  readonly usedCapability: boolean;
  readonly response: unknown;
  readonly fallbackReason?: string;
  readonly request: SamplingRequest;
}

export interface ElicitationRequest {
  readonly message: string;
  readonly requestedSchema?: Record<string, unknown>;
  readonly fallbackResponse?: Record<string, unknown>;
}

export interface ElicitationResult {
  readonly ok: boolean;
  readonly usedCapability: boolean;
  readonly response: unknown;
  readonly fallbackReason?: string;
  readonly request: ElicitationRequest;
}

export interface SamplingClient {
  readonly createMessage?: (request: SamplingRequest) => Promise<unknown>;
}

export interface ElicitationClient {
  readonly elicit?: (request: ElicitationRequest) => Promise<unknown>;
}

export interface AgenticWrapperOptions {
  readonly profile?: ClientCapabilityProfile;
  readonly samplingEnabled?: boolean;
}

export interface HighRiskConfirmationInput {
  readonly alias: string;
  readonly risk: ToolRiskClassification;
}

function activeProfile(profile?: ClientCapabilityProfile): ClientCapabilityProfile | undefined {
  return profile ?? getRequestTokens()?.capabilityProfile;
}

function capabilityEnabled(name: CapabilityName, profile?: ClientCapabilityProfile): boolean {
  return activeProfile(profile)?.capabilities[name]?.effective === true;
}

function disabledReason(name: CapabilityName, profile?: ClientCapabilityProfile): string {
  return (
    activeProfile(profile)?.capabilities[name]?.disabledReason ??
    `${name} disabled because no client capability profile is active`
  );
}

function samplingConfigured(options: AgenticWrapperOptions): boolean {
  if (options.samplingEnabled !== undefined) return options.samplingEnabled;
  return (
    process.env.MS365_MCP_SAMPLING_ENABLED === '1' ||
    process.env.MS365_MCP_SAMPLING_ENABLED === 'true'
  );
}

function redactString(value: string): string {
  return value
    .replace(BEARER_PATTERN, 'Bearer [redacted]')
    .replace(TOKEN_VALUE_PATTERN, (match) => match.replace(/[:=]\s*.*$/, ': [redacted]'));
}

export function redactAgenticPayload<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => redactAgenticPayload(item)) as T;
  if (typeof value === 'string') return redactString(value) as T;
  if (typeof value !== 'object' || value === null) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? '[redacted]' : redactAgenticPayload(nested),
    ])
  ) as T;
}

function sanitizeSamplingRequest(request: SamplingRequest): SamplingRequest {
  return {
    ...request,
    messages: request.messages.map((message) => redactAgenticPayload(message)),
    ...(request.systemPrompt ? { systemPrompt: redactString(request.systemPrompt) } : {}),
    ...(request.modelPreferences
      ? { modelPreferences: redactAgenticPayload(request.modelPreferences) }
      : {}),
  };
}

function sanitizeElicitationRequest(request: ElicitationRequest): ElicitationRequest {
  return redactAgenticPayload(request);
}

export async function requestSamplingWithFallback(
  client: SamplingClient | undefined,
  request: SamplingRequest,
  options: AgenticWrapperOptions = {}
): Promise<SamplingResult> {
  const sanitized = sanitizeSamplingRequest(request);
  if (
    !samplingConfigured(options) ||
    !capabilityEnabled('sampling', options.profile) ||
    !client?.createMessage
  ) {
    const reason = !samplingConfigured(options)
      ? 'sampling disabled because MS365_MCP_SAMPLING_ENABLED is not enabled'
      : !client?.createMessage
        ? 'sampling disabled because no client createMessage handler is available'
        : disabledReason('sampling', options.profile);
    return {
      ok: true,
      usedCapability: false,
      fallbackReason: reason,
      request: sanitized,
      response: {
        role: 'assistant',
        content: { type: 'text', text: sanitized.fallbackText ?? '' },
        stopReason: 'fallback',
      },
    };
  }

  const response = await client.createMessage(sanitized);
  return { ok: true, usedCapability: true, request: sanitized, response };
}

export async function requestElicitationWithFallback(
  client: ElicitationClient | undefined,
  request: ElicitationRequest,
  options: AgenticWrapperOptions = {}
): Promise<ElicitationResult> {
  const sanitized = sanitizeElicitationRequest(request);
  if (!capabilityEnabled('elicitation', options.profile) || !client?.elicit) {
    const reason = !client?.elicit
      ? 'elicitation disabled because no client elicit handler is available'
      : disabledReason('elicitation', options.profile);
    return {
      ok: true,
      usedCapability: false,
      fallbackReason: reason,
      request: sanitized,
      response: sanitized.fallbackResponse ?? { action: 'declined', content: {} },
    };
  }

  const response = await client.elicit(sanitized);
  return { ok: true, usedCapability: true, request: sanitized, response };
}

export async function requestHighRiskConfirmationWithFallback(
  client: ElicitationClient | undefined,
  input: HighRiskConfirmationInput,
  options: AgenticWrapperOptions = {}
): Promise<ElicitationResult> {
  const confirmationId = confirmationIdFor(input.alias, input.risk.riskLevel);
  return requestElicitationWithFallback(
    client,
    {
      message: `Confirm ${input.alias} (${input.risk.riskLevel} risk) before continuing.`,
      requestedSchema: {
        type: 'object',
        additionalProperties: false,
        required: ['confirmation', 'confirmationId'],
        properties: {
          confirmation: { const: true },
          confirmationId: { const: confirmationId },
        },
      },
      fallbackResponse: {
        action: 'confirmation_required',
        content: {
          alias: input.alias,
          riskLevel: input.risk.riskLevel,
          confirmationId,
          nextCall: { confirmation: true, confirmationId },
        },
      },
    },
    options
  );
}
