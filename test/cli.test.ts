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
    delete process.env.MS365_MCP_EXPECTED_USERNAME;
    delete process.env.MS365_MCP_EXPECTED_HOME_ACCOUNT_ID;
    delete process.env.MS365_MCP_AUTH_CACHE_COMMAND;
  });

  afterEach(() => {
    delete process.env.MS365_MCP_ALLOWED_SCOPES;
    delete process.env.MS365_MCP_EXPECTED_USERNAME;
    delete process.env.MS365_MCP_EXPECTED_HOME_ACCOUNT_ID;
    delete process.env.MS365_MCP_AUTH_CACHE_COMMAND;
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
});
