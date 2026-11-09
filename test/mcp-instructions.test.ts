import { describe, expect, it } from 'vitest';
import { buildMcpServerInstructions } from '../src/mcp-instructions.js';

describe('buildMcpServerInstructions', () => {
  const baseCtx = { orgMode: true, readOnly: false, multiAccount: false };

  it('includes general Graph guidance for standard mode', () => {
    const s = buildMcpServerInstructions({ ...baseCtx, discovery: false });
    expect(s).toContain('Microsoft Graph');
    expect(s).toContain('$filter');
    expect(s).not.toContain('DISCOVERY MODE ADD-ON');
  });

  it('appends discovery addon when discovery is true', () => {
    const s = buildMcpServerInstructions({ ...baseCtx, discovery: true });
    expect(s).toContain('DISCOVERY MODE ADD-ON');
    expect(s).toContain('search-tools');
    expect(s).toContain('$filter');
  });

  it('adds read-only line when readOnly', () => {
    const s = buildMcpServerInstructions({ ...baseCtx, discovery: false, readOnly: true });
    expect(s).toContain('read-only');
  });

  it('does not suggest account switching when multiAccount is false', () => {
    const s = buildMcpServerInstructions({ ...baseCtx, discovery: false, multiAccount: false });
    expect(s).not.toContain('Multiple accounts');
    expect(s).not.toContain('account parameter');
  });

  it.each([false, true])('prefers URL handoffs only when enabled (discovery=%s)', (discovery) => {
    const enabled = buildMcpServerInstructions({
      ...baseCtx,
      discovery,
      attachmentUrlsEnabled: true,
    });
    expect(enabled).toContain('for document reading and downloads, prefer get-download-url');
    expect(enabled).toContain('only when the caller explicitly needs bytes');
    expect(enabled).toContain('fresh URL for every fetch');
    expect(enabled).toContain('probes, conversion, continuation and retries');
    expect(enabled).toContain('same target, account and document selection');
    expect(enabled).toContain('mail attachments, meeting recordings, drive files');
    expect(enabled).toContain('does not scrub arbitrary response bodies');
    expect(enabled).toContain('tool filtering');
    expect(enabled).not.toContain('Use download-bytes for authenticated byte reads');

    const disabled = buildMcpServerInstructions({
      ...baseCtx,
      discovery,
      attachmentUrlsEnabled: false,
    });
    expect(disabled).not.toContain('Attachment URLs are enabled');
    expect(disabled).toContain('Use download-bytes for authenticated byte reads');
  });

  it('routes drive file downloads to get-download-url and authenticated byte reads to download-bytes', () => {
    const s = buildMcpServerInstructions({ ...baseCtx, discovery: false });
    expect(s).toContain('large drive/SharePoint file content');
    expect(s).toContain('prefer get-download-url');
    expect(s).toContain('download-bytes for authenticated byte reads');
    expect(s).toContain(
      'mail attachments, profile photos, Teams hosted content, and meeting recordings'
    );
    expect(s).toContain('relative Microsoft Graph paths, not absolute URLs');
  });
});

describe('hybrid instructions', () => {
  it('directs clients to use published schemas without a discovery round-trip', () => {
    expect(
      buildMcpServerInstructions({
        discovery: true,
        orgMode: true,
        readOnly: false,
        multiAccount: false,
        eagerTools: ['list-mail-messages'],
      })
    ).toContain('HYBRID MODE');
  });
});
