import os from 'node:os';
import path from 'node:path';

const APP_DIR_NAME = 'ms-365-mcp-server';

/**
 * Per-user config directory for anything we need to survive an upgrade.
 *
 * The auth cache used to default to a path inside the installed package, which under
 * npx resolves to `_npx/<hash>/node_modules/...` — a directory `npm cache clean` or a
 * version bump throws away, taking the refresh token with it (issue #602).
 */
export function getConfigDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA?.trim();
    return path.join(appData || path.join(os.homedir(), 'AppData', 'Roaming'), APP_DIR_NAME);
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', APP_DIR_NAME);
  }

  // XDG requires a relative XDG_CONFIG_HOME to be ignored rather than resolved.
  const xdg = process.env.XDG_CONFIG_HOME?.trim();
  if (xdg && path.isAbsolute(xdg)) {
    return path.join(xdg, APP_DIR_NAME);
  }
  return path.join(os.homedir(), '.config', APP_DIR_NAME);
}
