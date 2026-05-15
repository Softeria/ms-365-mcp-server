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
    Command: vi.fn(() => commanderMocks.mockCommand),
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
    delete process.env.MS365_MCP_AUTH_SCOPES;
  });

  afterEach(() => {
    delete process.env.MS365_MCP_AUTH_SCOPES;
  });

  describe('parseArgs', () => {
    it('should return command options', () => {
      const result = parseArgs();
      expect(result).toEqual({ file: 'test.xlsx' });
    });

    it('should parse --auth-scopes from CLI options', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({ authScopes: 'Mail.Read Files.Read' });

      const result = parseArgs();

      expect(result.authScopes).toBe('Mail.Read Files.Read');
    });

    it('should use MS365_MCP_AUTH_SCOPES as a fallback', () => {
      process.env.MS365_MCP_AUTH_SCOPES = 'Mail.Read Files.Read';
      commanderMocks.mockCommand.opts.mockReturnValue({});

      const result = parseArgs();

      expect(result.authScopes).toBe('Mail.Read Files.Read');
    });

    it('should prefer CLI auth scopes over environment auth scopes', () => {
      process.env.MS365_MCP_AUTH_SCOPES = 'Files.Read';
      commanderMocks.mockCommand.opts.mockReturnValue({ authScopes: 'Mail.Read' });

      const result = parseArgs();

      expect(result.authScopes).toBe('Mail.Read');
    });

    it('should fail closed when auth scopes are supplied empty', () => {
      commanderMocks.mockCommand.opts.mockReturnValue({ authScopes: '   ' });

      parseArgs();

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--auth-scopes'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
