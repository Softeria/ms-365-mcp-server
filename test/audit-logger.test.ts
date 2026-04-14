import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auditLog, hashAccount, type AuditEntry } from '../src/security/audit-logger.js';

describe('audit logger', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  describe('auditLog output channel', () => {
    it('writes to stderr, not stdout (MCP stdio protocol safety)', () => {
      auditLog({
        tool: 'list-mail-messages',
        method: 'GET',
        path: '/me/messages',
        scopes: ['Mail.Read'],
        account: null,
        status: 200,
        duration_ms: 12,
      });

      expect(stderrSpy).toHaveBeenCalledTimes(1);
      expect(stdoutSpy).not.toHaveBeenCalled();
    });

    it('writes a single line terminated by \\n', () => {
      auditLog(sampleEntry());
      const payload = stderrSpy.mock.calls[0]?.[0] as string;
      expect(payload.endsWith('\n')).toBe(true);
      expect(payload.split('\n').filter((s) => s.length > 0)).toHaveLength(1);
    });
  });

  describe('auditLog payload shape', () => {
    it('emits valid JSON', () => {
      auditLog(sampleEntry());
      const line = (stderrSpy.mock.calls[0]?.[0] as string).trimEnd();
      expect(() => JSON.parse(line)).not.toThrow();
    });

    it('includes an ISO 8601 timestamp', () => {
      auditLog(sampleEntry());
      const parsed = parseEmitted(stderrSpy);
      expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('preserves tool, method, path, scopes, status, duration_ms verbatim', () => {
      const entry: AuditEntry = {
        tool: 'send-mail',
        method: 'POST',
        path: '/me/sendMail',
        scopes: ['Mail.Send', 'Mail.ReadWrite'],
        account: null,
        status: 202,
        duration_ms: 318,
      };
      auditLog(entry);
      const parsed = parseEmitted(stderrSpy);
      expect(parsed.tool).toBe('send-mail');
      expect(parsed.method).toBe('POST');
      expect(parsed.path).toBe('/me/sendMail');
      expect(parsed.scopes).toEqual(['Mail.Send', 'Mail.ReadWrite']);
      expect(parsed.status).toBe(202);
      expect(parsed.duration_ms).toBe(318);
    });

    it('represents a missing account as "none", never as the raw email', () => {
      auditLog({ ...sampleEntry(), account: null });
      const parsed = parseEmitted(stderrSpy);
      expect(parsed.account).toBe('none');
    });
  });

  describe('account hashing — privacy', () => {
    it('never includes the raw account identifier in the output', () => {
      auditLog({ ...sampleEntry(), account: 'alice@example.com' });
      const line = stderrSpy.mock.calls[0]?.[0] as string;
      expect(line).not.toContain('alice@example.com');
      expect(line).not.toContain('alice');
    });

    it('outputs an account field prefixed with "sha256:"', () => {
      auditLog({ ...sampleEntry(), account: 'alice@example.com' });
      const parsed = parseEmitted(stderrSpy);
      expect(parsed.account).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('hashes deterministically (stable hash for a given input)', () => {
      expect(hashAccount('alice@example.com')).toBe(hashAccount('alice@example.com'));
    });

    it('produces different hashes for different accounts', () => {
      expect(hashAccount('alice@example.com')).not.toBe(hashAccount('bob@example.com'));
    });

    it('is case-insensitive for email-like inputs', () => {
      // Email local-part is technically case-sensitive per RFC 5321 but virtually
      // all real-world mail servers treat it case-insensitively. Canonicalising
      // here avoids a single user being logged as two different "accounts".
      expect(hashAccount('Alice@Example.com')).toBe(hashAccount('alice@example.com'));
    });
  });
});

function sampleEntry(): AuditEntry {
  return {
    tool: 'list-mail-messages',
    method: 'GET',
    path: '/me/messages',
    scopes: ['Mail.Read'],
    account: null,
    status: 200,
    duration_ms: 42,
  };
}

function parseEmitted(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const line = (spy.mock.calls[0]?.[0] as string).trimEnd();
  return JSON.parse(line);
}
