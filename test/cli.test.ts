import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseArgs } from '../src/cli.js';

const commanderMocks = vi.hoisted(() => {
  const mockCommand = {
    name: vi.fn().mockReturnThis(),
    description: vi.fn().mockReturnThis(),
    version: vi.fn().mockReturnThis(),
    option: vi.fn().mockReturnThis(),
    addOption: vi.fn().mockReturnThis(),
    parse: vi.fn(),
    opts: vi.fn().mockReturnValue({ file: 'test.xlsx' }),
  };

  return { mockCommand };
});

vi.mock('commander', () => {
  class MockOption {
    constructor(
      public flags: string,
      public description: string
    ) {}
    hideHelp() {
      return this;
    }
  }

  return {
    Command: vi.fn(function () {
      return commanderMocks.mockCommand;
    }),
    Option: MockOption,
  };
});

vi.mock('../src/auth.js', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      getToken: vi.fn().mockResolvedValue('mock-token'),
      logout: vi.fn().mockResolvedValue(true),
    })),
  };
});
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
vi.spyOn(process, 'exit').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('CLI Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commanderMocks.mockCommand.opts.mockReturnValue({ file: 'test.xlsx' });
    delete process.env.MS365_MCP_ALLOWED_SCOPES;
    delete process.env.MS365_MCP_USER_FIELDS;
    delete process.env.MS365_MCP_EXTRA_SCOPES;
    delete process.env.MS365_MCP_EXPECTED_USERNAME;
    delete process.env.MS365_MCP_EXPECTED_HOME_ACCOUNT_ID;
    delete process.env.MS365_MCP_AUTH_CACHE_COMMAND;
    delete process.env.MS365_MCP_BLOB_OUTPUT;
    delete process.env.ENABLED_TOOLS;
    delete process.env.ENABLED_TOOLS_FILE;
  });

  afterEach(() => {
    delete process.env.MS365_MCP_ALLOWED_SCOPES;
    delete process.env.MS365_MCP_USER_FIELDS;
    delete process.env.MS365_MCP_EXTRA_SCOPES;
    delete process.env.MS365_MCP_EXPECTED_USERNAME;
    delete process.env.MS365_MCP_EXPECTED_HOME_ACCOUNT_ID;
    delete process.env.MS365_MCP_AUTH_CACHE_COMMAND;
    delete process.env.MS365_MCP_HTTP_LOCAL_FILE_TOOLS;
    delete process.env.MS365_MCP_BLOB_OUTPUT;
    delete process.env.ENABLED_TOOLS;
    delete process.env.ENABLED_TOOLS_FILE;
  });

  describe('eager tool configuration', () => {
    afterEach(() => {
      delete process.env.MS365_MCP_EAGER_TOOLS;
    });
    it('normalizes exact names and removes duplicates', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({
        discovery: true,
        eagerTools: ' list-mail-messages,send-mail,list-mail-messages ',
      });
      expect(parseArgs().eagerTools).toEqual(['list-mail-messages', 'send-mail']);
    });
    it('uses environment fallback and CLI precedence', () => {
      process.env.MS365_MCP_EAGER_TOOLS = 'send-mail';
      commanderMocks.mockCommand.opts.mockReturnValue({ discovery: true });
      expect(parseArgs().eagerTools).toEqual(['send-mail']);
      commanderMocks.mockCommand.opts.mockReturnValue({
        discovery: true,
        eagerTools: 'list-mail-messages',
      });
      expect(parseArgs().eagerTools).toEqual(['list-mail-messages']);
    });
    it('keeps file-based availability filtering independent of eager presentation', () => {
      const dir = mkdtempSync(join(tmpdir(), 'hybrid-filter-'));
      const file = join(dir, 'tools.txt');
      writeFileSync(file, '^list-mail-messages$\n');
      commanderMocks.mockCommand.opts.mockReturnValue({
        discovery: true,
        enabledToolsFile: file,
        eagerTools: 'list-mail-messages,send-mail',
      });
      const result = parseArgs();
      expect(result.enabledTools).toBe('^list-mail-messages$');
      expect(result.eagerTools).toEqual(['list-mail-messages', 'send-mail']);
    });
    it('requires discovery and rejects empty selections', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({ eagerTools: 'send-mail' });
      expect(() => parseArgs()).toThrow('requires --discovery');
      for (const eagerTools of ['', 'send-mail,', ' , ']) {
        commanderMocks.mockCommand.opts.mockReturnValue({ discovery: true, eagerTools });
        expect(() => parseArgs()).toThrow('non-empty exact tool names');
      }
    });
  });

  describe('parseArgs', () => {
    it('should return command options', () => {
      const result = parseArgs();
      expect(result).toEqual({ file: 'test.xlsx' });
    });

    it('should parse --allowed-scopes from CLI options', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({ allowedScopes: 'Mail.Read Files.Read' });

      const result = parseArgs();

      expect(result.allowedScopes).toBe('Mail.Read Files.Read');
    });

    it('should parse --user-fields from CLI options', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({ userFields: 'id,displayName,mail' });

      expect(parseArgs().userFields).toBe('id,displayName,mail');
    });

    it('should use MS365_MCP_USER_FIELDS as a fallback', () => {
      process.env.MS365_MCP_USER_FIELDS = 'id,displayName';
      commanderMocks.mockCommand.opts.mockReturnValue({});

      expect(parseArgs().userFields).toBe('id,displayName');
    });

    it('should fail closed when user fields are supplied empty', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({ userFields: '   ' });

      parseArgs();

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--user-fields'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should fail closed when user fields name no fields', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({ userFields: ' , ,' });

      parseArgs();

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--user-fields'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it.each(['true', '1'])(
      'should enable --http-local-file-tools from MS365_MCP_HTTP_LOCAL_FILE_TOOLS=%s',
      (value) => {
        process.env.MS365_MCP_HTTP_LOCAL_FILE_TOOLS = value;
        commanderMocks.mockCommand.opts.mockReturnValue({});

        expect(parseArgs().httpLocalFileTools).toBe(true);
      }
    );

    it('should leave --http-local-file-tools off by default', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({});

      expect(parseArgs().httpLocalFileTools).toBeUndefined();
    });

    it('should fold --blob-output into MS365_MCP_BLOB_OUTPUT', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({ blobOutput: true });

      parseArgs();

      expect(process.env.MS365_MCP_BLOB_OUTPUT).toBe('true');
    });

    it('should leave MS365_MCP_BLOB_OUTPUT unset without --blob-output', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({});

      parseArgs();

      expect(process.env.MS365_MCP_BLOB_OUTPUT).toBeUndefined();
    });

    it('should use MS365_MCP_ALLOWED_SCOPES as a fallback', () => {
      process.env.MS365_MCP_ALLOWED_SCOPES = 'Mail.Read Files.Read';
      commanderMocks.mockCommand.opts.mockReturnValue({});

      const result = parseArgs();

      expect(result.allowedScopes).toBe('Mail.Read Files.Read');
    });

    it('should prefer CLI allowed scopes over environment allowed scopes', () => {
      process.env.MS365_MCP_ALLOWED_SCOPES = 'Files.Read';
      commanderMocks.mockCommand.opts.mockReturnValue({ allowedScopes: 'Mail.Read' });

      const result = parseArgs();

      expect(result.allowedScopes).toBe('Mail.Read');
    });

    it('should fail closed when allowed scopes are supplied empty', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({ allowedScopes: '   ' });

      parseArgs();

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--allowed-scopes'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should fail closed when allowed scopes env var is supplied empty', () => {
      process.env.MS365_MCP_ALLOWED_SCOPES = '   ';
      commanderMocks.mockCommand.opts.mockReturnValue({});

      parseArgs();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('MS365_MCP_ALLOWED_SCOPES')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should parse --extra-scopes from CLI options', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({
        extraScopes: 'CopilotPackages.ReadWrite.All',
      });

      const result = parseArgs();

      expect(result.extraScopes).toBe('CopilotPackages.ReadWrite.All');
    });

    it('should use MS365_MCP_EXTRA_SCOPES as a fallback', () => {
      process.env.MS365_MCP_EXTRA_SCOPES = 'CopilotPackages.ReadWrite.All';
      commanderMocks.mockCommand.opts.mockReturnValue({});

      const result = parseArgs();

      expect(result.extraScopes).toBe('CopilotPackages.ReadWrite.All');
    });

    it('should prefer CLI extra scopes over environment extra scopes', () => {
      process.env.MS365_MCP_EXTRA_SCOPES = 'Foo.Read';
      commanderMocks.mockCommand.opts.mockReturnValue({ extraScopes: 'Bar.Read' });

      const result = parseArgs();

      expect(result.extraScopes).toBe('Bar.Read');
    });

    it('should fail closed when extra scopes are supplied empty', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({ extraScopes: '   ' });

      parseArgs();

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--extra-scopes'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should parse expected username and home account ID from CLI options', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({
        expectedUsername: ' User@Example.com ',
        expectedHomeAccountId: ' home.id ',
      });

      const result = parseArgs();

      expect(result.expectedUsername).toBe('User@Example.com');
      expect(result.expectedHomeAccountId).toBe('home.id');
    });

    it('should use expected account env vars as fallbacks', () => {
      process.env.MS365_MCP_EXPECTED_USERNAME = 'env@example.com';
      process.env.MS365_MCP_EXPECTED_HOME_ACCOUNT_ID = 'env.home';
      commanderMocks.mockCommand.opts.mockReturnValue({});

      const result = parseArgs();

      expect(result.expectedUsername).toBe('env@example.com');
      expect(result.expectedHomeAccountId).toBe('env.home');
    });

    it('should prefer CLI expected account values over env vars', () => {
      process.env.MS365_MCP_EXPECTED_USERNAME = 'env@example.com';
      process.env.MS365_MCP_EXPECTED_HOME_ACCOUNT_ID = 'env.home';
      commanderMocks.mockCommand.opts.mockReturnValue({
        expectedUsername: 'cli@example.com',
        expectedHomeAccountId: 'cli.home',
      });

      const result = parseArgs();

      expect(result.expectedUsername).toBe('cli@example.com');
      expect(result.expectedHomeAccountId).toBe('cli.home');
    });

    it('should fail closed when expected username is supplied empty', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({ expectedUsername: '   ' });

      parseArgs();

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--expected-username'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should fail closed when expected home account ID env var is supplied empty', () => {
      process.env.MS365_MCP_EXPECTED_HOME_ACCOUNT_ID = '   ';
      commanderMocks.mockCommand.opts.mockReturnValue({});

      parseArgs();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('MS365_MCP_EXPECTED_HOME_ACCOUNT_ID')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('does not add auth-cache command CLI or args env parsing', () => {
      process.env.MS365_MCP_AUTH_CACHE_COMMAND = '/tmp/wrapper';
      commanderMocks.mockCommand.opts.mockReturnValue({});

      const result = parseArgs();
      const optionFlags = commanderMocks.mockCommand.option.mock.calls.map(([flags]) => flags);

      expect(optionFlags).not.toContain('--auth-cache-command <command>');
      expect(result).not.toHaveProperty('authCacheCommand');
      expect(result).not.toHaveProperty('authCacheCommandArgs');
    });
  });

  describe('--attachment-port / MS365_MCP_ATTACHMENT_PORT', () => {
    const prev = process.env.MS365_MCP_ATTACHMENT_PORT;

    afterEach(() => {
      if (prev === undefined) delete process.env.MS365_MCP_ATTACHMENT_PORT;
      else process.env.MS365_MCP_ATTACHMENT_PORT = prev;
    });

    it('passes a CLI-supplied port through untouched', () => {
      delete process.env.MS365_MCP_ATTACHMENT_PORT;
      commanderMocks.mockCommand.opts.mockReturnValue({ http: '3000', attachmentPort: '3001' });

      expect(parseArgs().attachmentPort).toBe('3001');
    });

    it('uses MS365_MCP_ATTACHMENT_PORT as a fallback', () => {
      process.env.MS365_MCP_ATTACHMENT_PORT = '3001';
      commanderMocks.mockCommand.opts.mockReturnValue({ http: '3000' });

      expect(parseArgs().attachmentPort).toBe('3001');
    });

    it('prefers the CLI flag over the env var', () => {
      process.env.MS365_MCP_ATTACHMENT_PORT = '4001';
      commanderMocks.mockCommand.opts.mockReturnValue({ http: '3000', attachmentPort: '3001' });

      expect(parseArgs().attachmentPort).toBe('3001');
    });

    it('leaves the option unset when neither is given, so the listener stays single', () => {
      delete process.env.MS365_MCP_ATTACHMENT_PORT;
      commanderMocks.mockCommand.opts.mockReturnValue({ http: '3000' });

      expect(parseArgs().attachmentPort).toBeUndefined();
    });

    it('does not validate the value here', () => {
      // Deliberate: the value only means anything alongside
      // --enable-attachment-urls and --http, both of which server.ts decides,
      // so it is parsed and refused there -- one message whichever way it
      // arrived. A second, partial check here would be a second message to keep
      // in step with the first.
      process.env.MS365_MCP_ATTACHMENT_PORT = 'not-a-port';
      commanderMocks.mockCommand.opts.mockReturnValue({ http: '3000' });

      expect(parseArgs().attachmentPort).toBe('not-a-port');
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('--attachment-host / MS365_MCP_ATTACHMENT_HOST', () => {
    const prev = process.env.MS365_MCP_ATTACHMENT_HOST;

    afterEach(() => {
      if (prev === undefined) delete process.env.MS365_MCP_ATTACHMENT_HOST;
      else process.env.MS365_MCP_ATTACHMENT_HOST = prev;
    });

    it('passes a CLI-supplied host through untouched', () => {
      delete process.env.MS365_MCP_ATTACHMENT_HOST;
      commanderMocks.mockCommand.opts.mockReturnValue({
        http: '3000',
        attachmentPort: '3001',
        attachmentHost: '127.0.0.2',
      });

      expect(parseArgs().attachmentHost).toBe('127.0.0.2');
    });

    it('uses MS365_MCP_ATTACHMENT_HOST as a fallback', () => {
      process.env.MS365_MCP_ATTACHMENT_HOST = '10.89.1.2';
      commanderMocks.mockCommand.opts.mockReturnValue({ http: '3000', attachmentPort: '3001' });

      expect(parseArgs().attachmentHost).toBe('10.89.1.2');
    });

    it('prefers the CLI flag over the env var', () => {
      process.env.MS365_MCP_ATTACHMENT_HOST = '10.89.9.9';
      commanderMocks.mockCommand.opts.mockReturnValue({
        http: '3000',
        attachmentPort: '3001',
        attachmentHost: '10.89.1.2',
      });

      expect(parseArgs().attachmentHost).toBe('10.89.1.2');
    });

    it('leaves the option unset when neither is given, so the MCP host is inherited', () => {
      delete process.env.MS365_MCP_ATTACHMENT_HOST;
      commanderMocks.mockCommand.opts.mockReturnValue({ http: '3000', attachmentPort: '3001' });

      expect(parseArgs().attachmentHost).toBeUndefined();
    });

    it('does not validate the value here, for the same reason the port is not', () => {
      process.env.MS365_MCP_ATTACHMENT_HOST = 'not a host';
      commanderMocks.mockCommand.opts.mockReturnValue({ http: '3000', attachmentPort: '3001' });

      expect(parseArgs().attachmentHost).toBe('not a host');
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('Dynamic Client Registration (DCR) — env var override', () => {
    const prevDisableDcr = process.env.MS365_MCP_DISABLE_DCR;

    afterEach(() => {
      if (prevDisableDcr === undefined) delete process.env.MS365_MCP_DISABLE_DCR;
      else process.env.MS365_MCP_DISABLE_DCR = prevDisableDcr;
    });

    it('enables DCR by default in HTTP mode', () => {
      delete process.env.MS365_MCP_DISABLE_DCR;
      commanderMocks.mockCommand.opts.mockReturnValue({ http: '3000' });
      const result = parseArgs();
      expect(result.enableDynamicRegistration).toBe(true);
    });

    it('disables DCR when MS365_MCP_DISABLE_DCR=true', () => {
      process.env.MS365_MCP_DISABLE_DCR = 'true';
      commanderMocks.mockCommand.opts.mockReturnValue({ http: '3000' });
      const result = parseArgs();
      expect(result.enableDynamicRegistration).toBe(false);
    });

    it('disables DCR when MS365_MCP_DISABLE_DCR=1', () => {
      process.env.MS365_MCP_DISABLE_DCR = '1';
      commanderMocks.mockCommand.opts.mockReturnValue({ http: '3000' });
      const result = parseArgs();
      expect(result.enableDynamicRegistration).toBe(false);
    });

    it('CLI --no-dynamic-registration still wins over env var unset', () => {
      delete process.env.MS365_MCP_DISABLE_DCR;
      commanderMocks.mockCommand.opts.mockReturnValue({ http: '3000', dynamicRegistration: false });
      const result = parseArgs();
      expect(result.enableDynamicRegistration).toBe(false);
    });

    it('env var has no effect outside HTTP mode', () => {
      process.env.MS365_MCP_DISABLE_DCR = 'true';
      commanderMocks.mockCommand.opts.mockReturnValue({});
      const result = parseArgs();
      expect(result.enableDynamicRegistration).toBeUndefined();
    });
  });

  describe('--preset with --enable-attachment-urls', () => {
    const allows = (tools: string | undefined, name: string) => new RegExp(tools!, 'i').test(name);

    it.each(['mail', 'calendar', 'teams', 'mail,calendar'])(
      'keeps get-download-url in --preset %s over HTTP so attachments can be minted',
      (preset) => {
        commanderMocks.mockCommand.opts.mockReturnValue({
          preset,
          http: '3000',
          enableAttachmentUrls: true,
        });
        const { enabledTools } = parseArgs();
        expect(allows(enabledTools, 'get-download-url')).toBe(true);
        expect(allows(enabledTools, 'download-bytes')).toBe(true);
        expect(allows(enabledTools, 'get-drive-item')).toBe(false);
      }
    );

    it('leaves get-download-url out of a non-drive preset without the flag', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({ preset: 'mail', http: '3000' });
      expect(allows(parseArgs().enabledTools, 'get-download-url')).toBe(false);
    });

    it('ignores the flag in stdio mode, where it has no effect', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({
        preset: 'mail',
        enableAttachmentUrls: true,
      });
      expect(allows(parseArgs().enabledTools, 'get-download-url')).toBe(false);
    });

    it('adds get-download-url to teams-write,mail because mail lacks it', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({
        preset: 'teams-write,mail',
        http: '3000',
        enableAttachmentUrls: true,
      });
      expect(allows(parseArgs().enabledTools, 'get-download-url')).toBe(true);
    });

    it.each(['files', 'all'])('adds no duplicate entry for --preset %s', (preset) => {
      commanderMocks.mockCommand.opts.mockReturnValue({
        preset,
        http: '3000',
        enableAttachmentUrls: true,
      });
      const { enabledTools } = parseArgs();
      expect(enabledTools!.match(/get-download-url/g)?.length ?? 0).toBeLessThanOrEqual(1);
    });

    it('lets ENABLED_TOOLS override the preset and the flag', () => {
      process.env.ENABLED_TOOLS = '^list-mail-messages$';
      commanderMocks.mockCommand.opts.mockReturnValue({
        preset: 'mail',
        http: '3000',
        enableAttachmentUrls: true,
      });
      try {
        expect(allows(parseArgs().enabledTools, 'get-download-url')).toBe(false);
      } finally {
        delete process.env.ENABLED_TOOLS;
      }
    });

    it('does not add a byte reader to the send-only teams-write preset', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({
        preset: 'teams-write',
        http: '3000',
        enableAttachmentUrls: true,
      });
      expect(allows(parseArgs().enabledTools, 'get-download-url')).toBe(false);
    });
  });

  describe('--enabled-tools-file', () => {
    const allows = (tools: string | undefined, name: string) => new RegExp(tools!, 'i').test(name);

    function writeToolsFile(contents: string): string {
      const dir = mkdtempSync(join(tmpdir(), 'cli-enabled-tools-'));
      const path = join(dir, 'tools.txt');
      writeFileSync(path, contents);
      return path;
    }

    it('loads tool names from --enabled-tools-file', () => {
      const path = writeToolsFile('list-mail-messages\nget-mail-message\n');
      commanderMocks.mockCommand.opts.mockReturnValue({ enabledToolsFile: path });
      const { enabledTools, enabledToolsFile } = parseArgs();
      expect(enabledToolsFile).toBeUndefined();
      expect(allows(enabledTools, 'list-mail-messages')).toBe(true);
      expect(allows(enabledTools, 'get-mail-message')).toBe(true);
      expect(allows(enabledTools, 'list-drives')).toBe(false);
    });

    it('lets --enabled-tools-file override --enabled-tools', () => {
      const path = writeToolsFile('list-drives\n');
      commanderMocks.mockCommand.opts.mockReturnValue({
        enabledTools: '^list-mail-messages$',
        enabledToolsFile: path,
      });
      const { enabledTools } = parseArgs();
      expect(allows(enabledTools, 'list-drives')).toBe(true);
      expect(allows(enabledTools, 'list-mail-messages')).toBe(false);
    });

    it('lets --preset override --enabled-tools-file', () => {
      const path = writeToolsFile('list-drives\n');
      commanderMocks.mockCommand.opts.mockReturnValue({
        enabledToolsFile: path,
        preset: 'mail',
      });
      const { enabledTools } = parseArgs();
      expect(allows(enabledTools, 'list-mail-messages')).toBe(true);
      expect(allows(enabledTools, 'list-drives')).toBe(false);
    });

    it('lets ENABLED_TOOLS_FILE override a preset', () => {
      const path = writeToolsFile('list-drives\n');
      process.env.ENABLED_TOOLS_FILE = path;
      commanderMocks.mockCommand.opts.mockReturnValue({ preset: 'mail' });
      const { enabledTools } = parseArgs();
      expect(allows(enabledTools, 'list-drives')).toBe(true);
      expect(allows(enabledTools, 'list-mail-messages')).toBe(false);
    });

    it('lets ENABLED_TOOLS_FILE override --enabled-tools', () => {
      const path = writeToolsFile('list-drives\n');
      process.env.ENABLED_TOOLS_FILE = path;
      commanderMocks.mockCommand.opts.mockReturnValue({ enabledTools: '^list-mail-messages$' });
      const { enabledTools } = parseArgs();
      expect(allows(enabledTools, 'list-drives')).toBe(true);
      expect(allows(enabledTools, 'list-mail-messages')).toBe(false);
    });

    it('lets ENABLED_TOOLS_FILE beat ENABLED_TOOLS', () => {
      const path = writeToolsFile('list-drives\n');
      process.env.ENABLED_TOOLS = '^list-mail-messages$';
      process.env.ENABLED_TOOLS_FILE = path;
      commanderMocks.mockCommand.opts.mockReturnValue({});
      const { enabledTools } = parseArgs();
      expect(allows(enabledTools, 'list-drives')).toBe(true);
      expect(allows(enabledTools, 'list-mail-messages')).toBe(false);
    });

    it('fails when the file path is empty', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({ enabledToolsFile: '   ' });
      parseArgs();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('could not read'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('fails when the file is missing', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({
        enabledToolsFile: '/no/such/enabled-tools-file.txt',
      });
      parseArgs();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('could not read'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('rejects an invalid regex from the file via the shared enabled-tools check', () => {
      const path = writeToolsFile('[invalid');
      commanderMocks.mockCommand.opts.mockReturnValue({ enabledToolsFile: path });
      parseArgs();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('invalid --enabled-tools regex pattern')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
