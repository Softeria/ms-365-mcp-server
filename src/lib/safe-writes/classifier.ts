export type ToolRiskLevel = 'low' | 'medium' | 'high';

export interface ClassifyToolRiskInput {
  alias: string;
  method: string;
  path?: string;
  readOnly?: boolean;
  toolFamily?: string;
}

export interface ToolRiskClassification {
  readOnly: boolean;
  write: boolean;
  destructive: boolean;
  idempotent: boolean;
  openWorld: boolean;
  riskLevel: ToolRiskLevel;
}

const HIGH_RISK_ALIAS_PATTERNS = [
  /(^|[-_.])send([-_.]|$)/i,
  /(^|[-_.])delete([-_.]|$)/i,
  /(^|[-_.])remove([-_.]|$)/i,
  /(^|[-_.])move([-_.]|$)/i,
  /permission/i,
  /admin/i,
  /^__spadmin__/i,
  /^__exo__/i,
];

const MEDIUM_RISK_METHODS = new Set(['PATCH', 'PUT']);
const HIGH_RISK_METHODS = new Set(['DELETE']);
const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function classifyToolRisk(input: ClassifyToolRiskInput): ToolRiskClassification {
  const method = input.method.toUpperCase();
  const readOnly = READ_ONLY_METHODS.has(method) || input.readOnly === true;
  const write = !readOnly;
  const aliasHighRisk = HIGH_RISK_ALIAS_PATTERNS.some((pattern) => pattern.test(input.alias));
  const destructive = write && (HIGH_RISK_METHODS.has(method) || aliasHighRisk);
  const riskLevel: ToolRiskLevel = readOnly
    ? 'low'
    : destructive || aliasHighRisk
      ? 'high'
      : MEDIUM_RISK_METHODS.has(method)
        ? 'medium'
        : 'low';

  return {
    readOnly,
    write,
    destructive,
    idempotent: readOnly || method === 'PUT',
    openWorld: true,
    riskLevel,
  };
}

export function confirmationIdFor(alias: string, riskLevel: ToolRiskLevel): string {
  return `confirm:${alias}:${riskLevel}`;
}

export function isConfirmationValid(
  alias: string,
  riskLevel: ToolRiskLevel,
  confirmation: unknown,
  confirmationId: unknown
): boolean {
  return confirmation === true && confirmationId === confirmationIdFor(alias, riskLevel);
}
