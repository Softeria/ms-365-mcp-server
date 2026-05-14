import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseArgs } from '../src/cli.js';

const mockOpts = vi.fn().mockReturnValue({ file: 'test.xlsx' });

vi.mock('commander', () => {
  const mockCommand = {
    name: vi.fn().mockReturnThis(),
    description: vi.fn().mockReturnThis(),
    version: vi.fn().mockReturnThis(),
    option: vi.fn().mockReturnThis(),
    addOption: vi.fn().mockReturnThis(),
    parse: vi.fn(),
    opts: () => mockOpts(),
  };

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
    Command: vi.fn(() => mockCommand),
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

describe('CLI Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('parseArgs', () => {
    it('should return command options', () => {
      const result = parseArgs();
      expect(result).toEqual({ file: 'test.xlsx' });
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
      mockOpts.mockReturnValue({ http: '3000' });
      const result = parseArgs();
      expect(result.enableDynamicRegistration).toBe(true);
    });

    it('disables DCR when MS365_MCP_DISABLE_DCR=true', () => {
      process.env.MS365_MCP_DISABLE_DCR = 'true';
      mockOpts.mockReturnValue({ http: '3000' });
      const result = parseArgs();
      expect(result.enableDynamicRegistration).toBe(false);
    });

    it('disables DCR when MS365_MCP_DISABLE_DCR=1', () => {
      process.env.MS365_MCP_DISABLE_DCR = '1';
      mockOpts.mockReturnValue({ http: '3000' });
      const result = parseArgs();
      expect(result.enableDynamicRegistration).toBe(false);
    });

    it('CLI --no-dynamic-registration still wins over env var unset', () => {
      delete process.env.MS365_MCP_DISABLE_DCR;
      mockOpts.mockReturnValue({ http: '3000', dynamicRegistration: false });
      const result = parseArgs();
      expect(result.enableDynamicRegistration).toBe(false);
    });

    it('env var has no effect outside HTTP mode', () => {
      process.env.MS365_MCP_DISABLE_DCR = 'true';
      mockOpts.mockReturnValue({});
      const result = parseArgs();
      expect(result.enableDynamicRegistration).toBeUndefined();
    });
  });
});
