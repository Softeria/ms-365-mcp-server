import 'dotenv/config';
import MicrosoftGraphServer from '../src/server.js';
import AuthManager, { resolveAuthScopes } from '../src/auth.js';
import { createTokenCacheStorage } from '../src/token-cache-storage.js';
import { version } from '../src/version.js';

let serverInstance: MicrosoftGraphServer | null = null;

export default async function handler(req: any, res: any) {
  if (!serverInstance) {
    const args = {
      http: true,
      v: true
    };

    const effectiveScopes = resolveAuthScopes(args);
    const storage = await createTokenCacheStorage({
      allowCommandStorage: false,
      logProvider: false,
    });
    
    const authManager = await AuthManager.create(
      effectiveScopes,
      {},
      { storage }
    );

    serverInstance = new MicrosoftGraphServer(authManager, args);
    await serverInstance.initialize(version);
    await serverInstance.start(); // This sets up express but skips listen()
  }

  if (serverInstance.app) {
      return serverInstance.app(req, res);
  }

  res.status(500).send('Server failed to initialize');
}
