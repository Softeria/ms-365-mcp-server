import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APP_ASSET_DIST_PATHS,
  APP_ASSET_SOURCE_DIR,
  scanAppAssets,
} from '../src/lib/mcp-apps/assets.js';
import { sanitizeHtmlSnippet, validateAppAssetText } from '../src/lib/mcp-apps/security.js';

const FORBIDDEN_MARKERS = ['access_token', 'refresh_token', 'client_secret', '.env'];

describe('MCP app resource security', () => {
  it('escapes user-provided HTML and text snippets before app rendering', () => {
    const unsafe = '<img src=x onerror="alert(1)"><script>alert("x")</script>&hello';

    expect(sanitizeHtmlSnippet(unsafe)).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;hello'
    );
  });

  it('rejects app assets containing token, secret, env, or external script markers', () => {
    for (const marker of FORBIDDEN_MARKERS) {
      expect(validateAppAssetText(`safe shell ${marker}`, `asset-${marker}.html`)).toEqual({
        ok: false,
        reason: expect.stringContaining(marker),
      });
    }

    expect(
      validateAppAssetText('<script src="http://evil.example/app.js"></script>', 'app.html')
    ).toEqual({
      ok: false,
      reason: expect.stringContaining('external script'),
    });
    expect(
      validateAppAssetText('<script src="https://evil.example/app.js"></script>', 'app.html')
    ).toEqual({
      ok: false,
      reason: expect.stringContaining('external script'),
    });
  });

  it('repo-owned app assets contain no forbidden markers or arbitrary external scripts', () => {
    const result = scanAppAssets(APP_ASSET_SOURCE_DIR);

    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it('dashboard app assets are part of the tsup copy pipeline', () => {
    const assetNames = [
      'app-shell.html',
      'inbox-triage.html',
      'calendar-brief.html',
      'teams-digest.html',
      'file-search.html',
      'permissions-overview.html',
      'connector-diagnostics.html',
      'skill-editor.html',
    ];

    for (const assetName of assetNames) {
      expect(fs.existsSync(path.join(APP_ASSET_SOURCE_DIR, assetName))).toBe(true);
      expect(APP_ASSET_DIST_PATHS).toContain(`dist/apps/${assetName}`);
    }
  });
});
