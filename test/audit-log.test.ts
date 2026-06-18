import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  auditLog,
  getUserIdentityForAudit,
  isAuditLogEnabled,
  __testing,
} from '../src/audit-log.js';

/**
 * Tests for the structured JSON audit log.
 *
 * The audit log is the artefact downstream deployments rely on for
 * DSAR / audit-trail compliance (GDPR, HIPAA, PIPEDA, SOC 2, …). It must
 * emit machine-parseable JSON, never leak token fragments or response
 * bodies, and be controllable via MS365_MCP_AUDIT_LOG=false for
 * environments that route audit elsewhere.
 */
describe('audit-log', () => {
  const prevAuditFlag = process.env.MS365_MCP_AUDIT_LOG;

  beforeEach(() => {
    vi.spyOn(__testing.auditLogger, 'info').mockImplementation(() => __testing.auditLogger);
  });

  afterEach(() => {
    if (prevAuditFlag === undefined) delete process.env.MS365_MCP_AUDIT_LOG;
    else process.env.MS365_MCP_AUDIT_LOG = prevAuditFlag;
    vi.restoreAllMocks();
  });

  describe('isAuditLogEnabled', () => {
    it('returns true by default', () => {
      delete process.env.MS365_MCP_AUDIT_LOG;
      expect(isAuditLogEnabled()).toBe(true);
    });

    it('returns false when MS365_MCP_AUDIT_LOG=false', () => {
      process.env.MS365_MCP_AUDIT_LOG = 'false';
      expect(isAuditLogEnabled()).toBe(false);
    });

    it('any other value keeps audit on', () => {
      process.env.MS365_MCP_AUDIT_LOG = 'true';
      expect(isAuditLogEnabled()).toBe(true);
      process.env.MS365_MCP_AUDIT_LOG = '0';
      expect(isAuditLogEnabled()).toBe(true); // strict 'false' string only
    });
  });

  describe('auditLog', () => {
    it('forwards the event payload to the audit logger', () => {
      auditLog({
        event: 'tool.call',
        request_id: '00000000-0000-0000-0000-000000000001',
        user_principal_name: 'alice@example.com',
        tool: 'list-mail-messages',
        http_method: 'GET',
        status: 'success',
        duration_ms: 123,
      });
      expect(__testing.auditLogger.info).toHaveBeenCalledTimes(1);
      const [payload] = (__testing.auditLogger.info as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(payload).toMatchObject({
        event: 'tool.call',
        request_id: '00000000-0000-0000-0000-000000000001',
        user_principal_name: 'alice@example.com',
        tool: 'list-mail-messages',
        http_method: 'GET',
        status: 'success',
        duration_ms: 123,
      });
    });

    it('does NOT emit when MS365_MCP_AUDIT_LOG=false', () => {
      process.env.MS365_MCP_AUDIT_LOG = 'false';
      auditLog({
        event: 'tool.call',
        request_id: 'x',
        tool: 'send-mail',
        status: 'denied',
      });
      expect(__testing.auditLogger.info).not.toHaveBeenCalled();
    });

    it('accepts all three status values', () => {
      auditLog({ event: 'tool.call', request_id: '1', tool: 't', status: 'success' });
      auditLog({ event: 'tool.call', request_id: '2', tool: 't', status: 'error' });
      auditLog({ event: 'tool.call', request_id: '3', tool: 't', status: 'denied' });
      expect(__testing.auditLogger.info).toHaveBeenCalledTimes(3);
    });
  });

  describe('getUserIdentityForAudit', () => {
    /**
     * Build an unsigned JWT-shaped string (`header.payload.signature`) for tests.
     * Signature verification is the auth middleware's job — the audit helper
     * intentionally decodes the payload without verifying.
     */
    function makeFakeJwt(claims: Record<string, unknown>): string {
      const b64 = (obj: Record<string, unknown>) =>
        Buffer.from(JSON.stringify(obj)).toString('base64url');
      return `${b64({ alg: 'none' })}.${b64(claims)}.sig`;
    }

    it('returns undefined when no token is provided', () => {
      expect(getUserIdentityForAudit(undefined)).toBeUndefined();
      expect(getUserIdentityForAudit('')).toBeUndefined();
    });

    it('returns undefined for a malformed token', () => {
      expect(getUserIdentityForAudit('not-a-jwt')).toBeUndefined();
      expect(getUserIdentityForAudit('only.one')).toBeUndefined();
      expect(getUserIdentityForAudit('a.@@invalid-base64.c')).toBeUndefined();
    });

    it('prefers upn over preferred_username, email, sub', () => {
      const token = makeFakeJwt({
        upn: 'alice@example.com',
        preferred_username: 'mbourget@lci.local',
        email: 'marc@personal.com',
        sub: 'abcd-1234',
      });
      expect(getUserIdentityForAudit(token)).toBe('alice@example.com');
    });

    it('falls back to preferred_username when upn is missing', () => {
      const token = makeFakeJwt({
        preferred_username: 'mbourget@lci.local',
        sub: 'abcd-1234',
      });
      expect(getUserIdentityForAudit(token)).toBe('mbourget@lci.local');
    });

    it('falls back to email then sub', () => {
      expect(getUserIdentityForAudit(makeFakeJwt({ email: 'x@y.z' }))).toBe('x@y.z');
      expect(getUserIdentityForAudit(makeFakeJwt({ sub: 'oid-123' }))).toBe('oid-123');
    });

    it('returns undefined when no usable claim is present', () => {
      const token = makeFakeJwt({ aud: 'api://app-id', iss: 'https://login.microsoftonline.com/' });
      expect(getUserIdentityForAudit(token)).toBeUndefined();
    });

    it('handles base64url padding correctly', () => {
      // Claim that produces a payload requiring padding when decoded
      const token = makeFakeJwt({ upn: 'a' });
      expect(getUserIdentityForAudit(token)).toBe('a');
    });
  });
});
