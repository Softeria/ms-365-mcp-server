import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const msal = vi.hoisted(() => ({
  configs: [] as Array<{ auth: Record<string, unknown> }>,
  acquireTokenByClientCredential: vi.fn(),
  miConfigs: [] as Array<{ managedIdentityIdParams?: Record<string, string> }>,
  acquireTokenManagedIdentity: vi.fn(),
}));
vi.mock('@azure/msal-node', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@azure/msal-node')>();
  return {
    ...actual,
    ConfidentialClientApplication: class {
      acquireTokenByClientCredential = msal.acquireTokenByClientCredential;
      constructor(config: { auth: Record<string, unknown> }) {
        msal.configs.push(config);
      }
    },
    ManagedIdentityApplication: class {
      acquireToken = msal.acquireTokenManagedIdentity;
      constructor(config: { managedIdentityIdParams?: Record<string, string> }) {
        msal.miConfigs.push(config);
      }
    },
  };
});

const {
  AppTokenClient,
  assertAppModeOptions,
  describeAppToken,
  loadCertificateCredential,
  parseManagedIdentity,
} = await import('../src/app-mode.js');
const { buildAllowedScopeDiagnostics, isEndpointInScopeMode } = await import('../src/auth.js');
const AuthManager = (await import('../src/auth.js')).default;
const MicrosoftGraphServer = (await import('../src/server.js')).default;
const { clearSecretsCache } = await import('../src/secrets.js');
const logger = (await import('../src/logger.js')).default;
const { buildToolsRegistry, registerDiscoveryTools, registerGraphTools } =
  await import('../src/graph-tools.js');
const { buildMcpServerInstructions } = await import('../src/mcp-instructions.js');

const endpoints = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'src', 'endpoints.json'), 'utf8')
) as Array<{ toolName: string; pathPattern: string; appScopes?: unknown }>;

const secrets = {
  clientId: 'my-own-app',
  tenantId: 'contoso.onmicrosoft.com',
  clientSecret: 's3cret',
  cloudType: 'global' as const,
};

function fakeJwt(claims: Record<string, unknown>): string {
  return `x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.y`;
}

beforeEach(() => {
  msal.configs.length = 0;
  msal.acquireTokenByClientCredential.mockReset();
  msal.miConfigs.length = 0;
  msal.acquireTokenManagedIdentity.mockReset();
});

describe('assertAppModeOptions', () => {
  it('accepts plain stdio options', () => {
    expect(() => assertAppModeOptions({ appMode: true, readOnly: true })).not.toThrow();
  });

  it('names every conflicting flag', () => {
    expect(() =>
      assertAppModeOptions({ appMode: true, http: '127.0.0.1:3000', obo: true, login: true })
    ).toThrow(/--http, --obo, --login/);
  });

  it('refuses --extra-scopes, since the app always asks for /.default', () => {
    expect(() => assertAppModeOptions({ appMode: true, extraScopes: 'Mail.Read' })).toThrow(
      /--extra-scopes/
    );
  });

  it('refuses MS365_MCP_OAUTH_TOKEN', () => {
    vi.stubEnv('MS365_MCP_OAUTH_TOKEN', 'tok');
    try {
      expect(() => assertAppModeOptions({ appMode: true })).toThrow(/MS365_MCP_OAUTH_TOKEN/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('AppTokenClient', () => {
  it.each(['common', 'organizations', 'consumers', ''])('refuses tenant %j', (tenantId) => {
    expect(() => new AppTokenClient({ ...secrets, tenantId }, {})).toThrow(/MS365_MCP_TENANT_ID/);
  });

  it('refuses the built-in client id', () => {
    expect(
      () => new AppTokenClient({ ...secrets, clientId: '084a3e9f-a9f4-43f7-89f9-d229cf97853e' }, {})
    ).toThrow(/MS365_MCP_CLIENT_ID/);
  });

  it('needs exactly one credential', () => {
    expect(() => new AppTokenClient({ ...secrets, clientSecret: undefined }, {})).toThrow(
      /needs one of MS365_MCP_CLIENT_SECRET, .*MS365_MCP_MANAGED_IDENTITY/
    );
    expect(() => new AppTokenClient(secrets, { certPath: '/some/cert.pem' })).toThrow(
      /only one credential.*a client secret \(MS365_MCP_CLIENT_SECRET, \.env or Key Vault\) and MS365_MCP_CLIENT_CERTIFICATE_PATH/
    );
    expect(
      () =>
        new AppTokenClient(
          { ...secrets, clientSecret: undefined },
          { federatedTokenFile: '/t', managedIdentity: 'system' }
        )
    ).toThrow(/MS365_MCP_FEDERATED_TOKEN_FILE and MS365_MCP_MANAGED_IDENTITY/);
  });

  it('requests the Graph .default scope for the tenant', async () => {
    msal.acquireTokenByClientCredential.mockResolvedValue({ accessToken: 'app-token' });
    const client = new AppTokenClient(secrets, {});

    expect(await client.getToken()).toBe('app-token');
    expect(msal.configs[0].auth).toMatchObject({
      clientId: 'my-own-app',
      clientSecret: 's3cret',
      authority: 'https://login.microsoftonline.com/contoso.onmicrosoft.com',
    });
    expect(msal.acquireTokenByClientCredential).toHaveBeenCalledWith({
      scopes: ['https://graph.microsoft.com/.default'],
    });
  });
});

describe('federated token', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ms365-app-federated-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const noSecret = { ...secrets, clientSecret: undefined };

  it('re-reads the token file for every assertion, since these tokens rotate', async () => {
    const tokenFile = path.join(dir, 'token');
    writeFileSync(tokenFile, 'first-jwt\n');
    new AppTokenClient(noSecret, { federatedTokenFile: tokenFile });

    const auth = msal.configs[0].auth;
    expect(auth.clientSecret).toBeUndefined();
    expect(auth.authority).toBe('https://login.microsoftonline.com/contoso.onmicrosoft.com');
    const assertion = auth.clientAssertion as () => Promise<string>;
    expect(await assertion()).toBe('first-jwt');
    writeFileSync(tokenFile, 'rotated-jwt');
    expect(await assertion()).toBe('rotated-jwt');
  });

  it('reports a token file that disappears after startup', async () => {
    const tokenFile = path.join(dir, 'vanishing');
    writeFileSync(tokenFile, 'jwt');
    new AppTokenClient(noSecret, { federatedTokenFile: tokenFile });
    rmSync(tokenFile);
    const assertion = msal.configs[0].auth.clientAssertion as () => Promise<string>;
    await expect(assertion()).rejects.toThrow(/Cannot read MS365_MCP_FEDERATED_TOKEN_FILE/);
  });

  it('fails at startup on a missing or empty token file', () => {
    expect(
      () => new AppTokenClient(noSecret, { federatedTokenFile: path.join(dir, 'missing') })
    ).toThrow(/Cannot read MS365_MCP_FEDERATED_TOKEN_FILE/);
    const empty = path.join(dir, 'empty');
    writeFileSync(empty, '  \n');
    expect(() => new AppTokenClient(noSecret, { federatedTokenFile: empty })).toThrow(/is empty/);
  });

  it('still needs a real tenant and your own app registration', () => {
    const tokenFile = path.join(dir, 'token2');
    writeFileSync(tokenFile, 'jwt');
    expect(
      () =>
        new AppTokenClient({ ...noSecret, tenantId: 'common' }, { federatedTokenFile: tokenFile })
    ).toThrow(/MS365_MCP_TENANT_ID/);
  });
});

describe('managed identity', () => {
  // No tenant, client id or secret: the identity belongs to the Azure host
  const hostOnly = { ...secrets, clientSecret: undefined, tenantId: 'common', clientId: '' };

  it.each(['system', 'SYSTEM', 'true', '1'])('treats %j as system-assigned', (value) => {
    expect(parseManagedIdentity(value)).toEqual({});
  });

  it('takes a client id for a user-assigned identity', () => {
    expect(parseManagedIdentity(' 11111111-2222-3333-4444-555555555555 ')).toEqual({
      userAssignedClientId: '11111111-2222-3333-4444-555555555555',
    });
  });

  it('refuses anything else', () => {
    expect(() => parseManagedIdentity('yes please')).toThrow(/MS365_MCP_MANAGED_IDENTITY/);
  });

  it('treats MS365_MCP_MANAGED_IDENTITY=false as unset', () => {
    vi.stubEnv('MS365_MCP_MANAGED_IDENTITY', 'false');
    try {
      expect(() => new AppTokenClient(secrets)).not.toThrow();
      expect(msal.miConfigs).toHaveLength(0);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('starts on GCC High with no client id, tenant or Key Vault', async () => {
    vi.stubEnv('MS365_MCP_CLOUD_TYPE', 'gcc-high');
    vi.stubEnv('MS365_MCP_MANAGED_IDENTITY', 'system');
    vi.stubEnv('MS365_MCP_CLIENT_ID', '');
    vi.stubEnv('MS365_MCP_TENANT_ID', '');
    vi.stubEnv('MS365_MCP_CLIENT_SECRET', '');
    vi.stubEnv('MS365_MCP_KEYVAULT_URL', 'https://unreachable.vault.azure.net');
    msal.acquireTokenManagedIdentity.mockResolvedValue({ accessToken: 'mi-token' });
    clearSecretsCache();
    try {
      const authManager = await AuthManager.create([], undefined, {
        appMode: true,
        storage: { load: vi.fn(), save: vi.fn(), delete: vi.fn() } as never,
      });
      expect(await authManager.getToken()).toBe('mi-token');
      expect(msal.acquireTokenManagedIdentity).toHaveBeenCalledWith({
        resource: 'https://graph.microsoft.us',
      });
      // The server must not load the secrets again (Key Vault, or a gcc-high built-in client id that does not exist)
      const server = new MicrosoftGraphServer(authManager, { appMode: true });
      await expect(server.initialize('test')).resolves.toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('refuses a managed identity next to a certificate', () => {
    expect(
      () => new AppTokenClient(hostOnly, { certPath: '/c.pem', managedIdentity: 'system' })
    ).toThrow(/MS365_MCP_CLIENT_CERTIFICATE_PATH and MS365_MCP_MANAGED_IDENTITY/);
  });

  it('asks the host for a Graph token without tenant or app checks', async () => {
    msal.acquireTokenManagedIdentity.mockResolvedValue({ accessToken: 'mi-token' });
    const client = new AppTokenClient(hostOnly, { managedIdentity: 'system' });

    expect(await client.getToken()).toBe('mi-token');
    expect(msal.configs).toHaveLength(0);
    expect(msal.miConfigs[0]).toEqual({ managedIdentityIdParams: {} });
    expect(msal.acquireTokenManagedIdentity).toHaveBeenCalledWith({
      resource: 'https://graph.microsoft.com',
    });
  });

  it('warns that MS365_MCP_CLIENT_ID does not pick the identity', () => {
    new AppTokenClient({ ...hostOnly, clientId: 'some-app' }, { managedIdentity: 'system' });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringMatching(/MS365_MCP_CLIENT_ID is ignored with a managed identity/)
    );
  });

  it('passes a user-assigned client id to MSAL', () => {
    new AppTokenClient(hostOnly, { managedIdentity: '11111111-2222-3333-4444-555555555555' });
    expect(msal.miConfigs[0]).toEqual({
      managedIdentityIdParams: { userAssignedClientId: '11111111-2222-3333-4444-555555555555' },
    });
  });

  it('uses the sovereign cloud Graph resource', () => {
    msal.acquireTokenManagedIdentity.mockResolvedValue({ accessToken: 'mi-token' });
    const client = new AppTokenClient(
      { ...hostOnly, cloudType: 'china' },
      { managedIdentity: 'system' }
    );
    return client.getToken().then(() =>
      expect(msal.acquireTokenManagedIdentity).toHaveBeenCalledWith({
        resource: 'https://microsoftgraph.chinacloudapi.cn',
      })
    );
  });
});

const hasOpenssl = (() => {
  try {
    execFileSync('openssl', ['version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasOpenssl)('loadCertificateCredential', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ms365-app-cert-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  function makePem(): { pemPath: string; certPem: string; keyPem: string } {
    const keyPath = path.join(dir, 'key.pem');
    const certPath = path.join(dir, 'cert.pem');
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-keyout',
        keyPath,
        '-out',
        certPath,
        '-days',
        '1',
        '-subj',
        '/CN=ms365-mcp-test',
      ],
      { stdio: 'ignore' }
    );
    const keyPem = readFileSync(keyPath, 'utf8');
    const certPem = readFileSync(certPath, 'utf8');
    const pemPath = path.join(dir, 'both.pem');
    writeFileSync(pemPath, keyPem + certPem);
    return { pemPath, certPem, keyPem };
  }

  it('reads the key and the SHA-256 thumbprint from one PEM file', () => {
    const { pemPath, certPem, keyPem } = makePem();
    const expected = execFileSync('openssl', ['x509', '-noout', '-fingerprint', '-sha256'], {
      input: certPem,
    })
      .toString()
      .split('=')[1]
      .trim()
      .replace(/:/g, '');

    const credential = loadCertificateCredential(pemPath);
    expect(credential.thumbprintSha256).toBe(expected);
    expect(credential.privateKey.trim()).toBe(keyPem.trim());
  });

  it('refuses a file without the private key', () => {
    const { certPem } = makePem();
    const certOnly = path.join(dir, 'cert-only.pem');
    writeFileSync(certOnly, certPem);
    expect(() => loadCertificateCredential(certOnly)).toThrow(/both the certificate and its/);
  });

  it('passes the certificate to MSAL instead of a secret', () => {
    const { pemPath } = makePem();
    new AppTokenClient({ ...secrets, clientSecret: undefined }, { certPath: pemPath });
    expect(msal.configs[0].auth.clientSecret).toBeUndefined();
    expect(msal.configs[0].auth.clientCertificate).toMatchObject({
      thumbprintSha256: expect.stringMatching(/^[0-9A-F]{64}$/),
    });
  });
});

describe('describeAppToken', () => {
  it('reads app id, tenant and roles', () => {
    expect(describeAppToken(fakeJwt({ appid: 'a', tid: 't', roles: ['Mail.Read'] }))).toEqual({
      appId: 'a',
      tenantId: 't',
      roles: ['Mail.Read'],
    });
  });

  it('treats a malformed token as having no roles', () => {
    expect(describeAppToken('nope').roles).toEqual([]);
  });
});

describe('AuthManager in app mode', () => {
  // A delegated account sits in the cache: app mode must never read it
  const storage = {
    load: vi.fn(async () => 'cached-delegated-account'),
    save: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
  };

  async function appAuthManager() {
    vi.stubEnv('MS365_MCP_CLIENT_ID', secrets.clientId);
    vi.stubEnv('MS365_MCP_TENANT_ID', secrets.tenantId);
    vi.stubEnv('MS365_MCP_CLIENT_SECRET', secrets.clientSecret);
    try {
      return await AuthManager.create([], undefined, { appMode: true, storage: storage as never });
    } finally {
      vi.unstubAllEnvs();
    }
  }

  it('serves every token from client credentials', async () => {
    msal.acquireTokenByClientCredential.mockResolvedValue({ accessToken: 'app-token' });
    const authManager = await appAuthManager();

    expect(authManager.isAppMode()).toBe(true);
    expect(await authManager.getToken()).toBe('app-token');
    expect(await authManager.getTokenForAccount()).toBe('app-token');
    await expect(authManager.getTokenForAccount('someone@contoso.com')).rejects.toThrow(/app mode/);
    expect(await authManager.isMultiAccount()).toBe(false);
    expect(storage.load).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('surfaces a failed token request instead of falling back', async () => {
    msal.acquireTokenByClientCredential.mockRejectedValue(new Error('AADSTS7000215'));
    const authManager = await appAuthManager();
    await expect(authManager.getToken()).rejects.toThrow(/AADSTS7000215/);
    expect(storage.load).not.toHaveBeenCalled();
  });

  it('--verify-login reports the granted roles', async () => {
    const authManager = await appAuthManager();
    msal.acquireTokenByClientCredential.mockResolvedValue({
      accessToken: fakeJwt({ appid: 'my-own-app', tid: 'tid', roles: ['User.Read.All'] }),
    });
    expect(await authManager.testLogin()).toMatchObject({
      success: true,
      appData: { appId: 'my-own-app', roles: ['User.Read.All'] },
    });

    // An app granted only through Exchange RBAC for Applications has no roles claim at all
    msal.acquireTokenByClientCredential.mockResolvedValue({ accessToken: fakeJwt({ tid: 'tid' }) });
    expect(await authManager.testLogin()).toMatchObject({
      success: true,
      message: expect.stringMatching(/Exchange RBAC/),
      appData: { roles: [] },
    });
  });
});

describe('app-mode tool surface', () => {
  const appTools = endpoints.filter((e) => e.appScopes !== undefined).map((e) => e.toolName);

  it('only endpoints with appScopes exist in app mode', () => {
    expect(appTools.length).toBeGreaterThan(0);
    expect(isEndpointInScopeMode({ appScopes: [] }, 'app')).toBe(true);
    expect(isEndpointInScopeMode({ scopes: ['Mail.Read'] }, 'app')).toBe(false);
    expect([...buildToolsRegistry(false, 'app').keys()].sort()).toEqual([...appTools].sort());
  });

  it('--list-permissions lists application permissions, not delegated ones', () => {
    const { toolPermissions } = buildAllowedScopeDiagnostics({ appMode: true, orgMode: true });
    expect(toolPermissions).toContain('Mail.Send');
    expect(toolPermissions).toContain('User.Read.All');
    expect(toolPermissions).not.toContain('Mail.Send.Shared');
  });

  it('--allowed-scopes narrows by appScopes', () => {
    const registry = buildToolsRegistry(false, 'app', undefined, 'User.Read.All');
    expect(registry.has('list-users')).toBe(true);
    expect(registry.has('send-shared-mailbox-mail')).toBe(false);
  });

  it('registers no /me-only utility tools', () => {
    const server = new McpServer({ name: 't', version: '1' });
    const names: string[] = [];
    vi.spyOn(server, 'registerTool').mockImplementation(((name: string) => {
      names.push(name);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- registerTool() has many overloads
    }) as any);
    vi.spyOn(server, 'tool').mockImplementation(((name: string) => {
      names.push(name);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool() has many overloads
    }) as any);
    registerGraphTools(server, { graphRequest: vi.fn() } as never, {
      orgMode: true,
      appMode: true,
    });

    expect(names).toContain('list-users');
    expect(names).toContain('download-bytes');
    expect(names).not.toContain('list-mail-messages');
    expect(names).not.toContain('read-mail-text');
    // The upload tools take /users/{user-id}/... targets too
    expect(names).toContain('get-upload-url');
  });

  it('discovery mode only knows app tools', () => {
    const server = new McpServer({ name: 't', version: '1' });
    const names: string[] = [];
    const record = ((name: string) => {
      names.push(name);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool() has many overloads
    }) as any;
    vi.spyOn(server, 'registerTool').mockImplementation(record);
    vi.spyOn(server, 'tool').mockImplementation(record);
    const unavailable: string[] = [];
    registerDiscoveryTools(server, { graphRequest: vi.fn() } as never, {
      orgMode: true,
      appMode: true,
      eagerTools: ['list-users', 'list-mail-messages'],
      onUnavailableEagerTool: (name) => unavailable.push(name),
    });

    expect(names).toContain('list-users');
    expect(names).not.toContain('list-mail-messages');
    expect(unavailable).toEqual(['list-mail-messages']);
  });

  it('tells the model there is no /me', () => {
    const text = buildMcpServerInstructions({
      orgMode: true,
      appMode: true,
      readOnly: false,
      multiAccount: false,
      discovery: false,
    });
    expect(text).toMatch(/no signed-in user/);
  });
});

describe('403 permission hint', () => {
  async function scopeError(isAppMode: boolean): Promise<string> {
    const { default: GraphClient } = await import('../src/graph-client.js');
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(
        '{"error":{"code":"ErrorAccessDenied","message":"needs permission Mail.Read"}}',
        {
          status: 403,
        }
      )) as typeof fetch;
    try {
      const client = new GraphClient(
        { getToken: async () => 'tok', isAppMode: () => isAppMode } as never,
        { clientId: 'x', tenantId: 't', cloudType: 'global' } as never,
        'json'
      );
      return await client.makeRequest('/users/u/messages').then(
        () => '',
        (error: Error) => error.message
      );
    } finally {
      global.fetch = originalFetch;
    }
  }

  it('points app mode at the app registration, not --org-mode', async () => {
    const message = await scopeError(true);
    expect(message).toMatch(/application permission/);
    expect(message).not.toMatch(/--org-mode/);
  });

  it('keeps the --org-mode hint otherwise', async () => {
    expect(await scopeError(false)).toMatch(/--org-mode/);
  });
});
