import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCustomExcelTools } from '../src/custom-excel-tools.js';

describe('Custom Excel Tools', () => {
  let server: { tool: ReturnType<typeof vi.fn> };
  let graphClient: { graphRequest: ReturnType<typeof vi.fn> };
  let authManager: { getTokenForAccount: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    server = {
      tool: vi.fn(),
    };
    graphClient = {
      graphRequest: vi.fn(),
    };
    authManager = {
      getTokenForAccount: vi.fn(),
    };
  });

  it('registers workbook creation and write tools when not read-only', () => {
    const count = registerCustomExcelTools(
      server as never,
      graphClient as never,
      authManager as never,
      false
    );

    expect(count).toBe(3);
    expect(server.tool).toHaveBeenCalledWith(
      'create-excel-workbook',
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
      expect.any(Function)
    );
    expect(server.tool).toHaveBeenCalledWith(
      'update-excel-range',
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
      expect.any(Function)
    );
    expect(server.tool).toHaveBeenCalledWith(
      'create-excel-worksheet',
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('skips registration in read-only mode', () => {
    const count = registerCustomExcelTools(
      server as never,
      graphClient as never,
      authManager as never,
      true
    );

    expect(count).toBe(0);
    expect(server.tool).not.toHaveBeenCalled();
  });
});
