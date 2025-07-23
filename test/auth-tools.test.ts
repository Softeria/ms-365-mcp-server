import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAuthTools } from '../src/auth-tools.js';

vi.mock('zod', () => {
  const mockZod = {
    boolean: () => ({
      default: () => ({
        describe: () => 'mocked-zod-boolean',
      }),
    }),
    string: () => ({
      describe: () => 'mocked-zod-string',
    }),
    object: () => ({
      strict: () => 'mocked-zod-object',
    }),
  };
  return { z: mockZod };
});

describe('Auth Tools', () => {
  let server: { tool: ReturnType<typeof vi.fn> };
  let authManager: { logout: ReturnType<typeof vi.fn>; testLogin: ReturnType<typeof vi.fn> };
  let loginTool: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loginTool = vi.fn();

    server = {
      tool: vi.fn((name, description, schema, handler) => {
        if (name === 'login') {
          loginTool = handler;
        }
      }),
    };

    authManager = {
      testLogin: vi.fn(),
      acquireTokenByDeviceCode: vi.fn(),
    };

    registerAuthTools(server, authManager);
  });

  describe('login tool', () => {
    it('should check if already logged in when force=false', async () => {
      authManager.testLogin.mockResolvedValue({
        success: true,
        userData: { displayName: 'Test User' },
      });

      const result = await loginTool({ force: false });

      expect(authManager.testLogin).toHaveBeenCalled();
      expect(authManager.acquireTokenByDeviceCode).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('Already logged in');
    });

    it('should force login when force=true even if already logged in', async () => {
      authManager.testLogin.mockResolvedValue({
        success: true,
        userData: { displayName: 'Test User' },
      });

      authManager.acquireTokenByDeviceCode.mockImplementation(
        (callback: (text: string) => void) => {
          callback('Login instructions');
          return Promise.resolve();
        }
      );

      const result = await loginTool({ force: true });

      expect(authManager.testLogin).not.toHaveBeenCalled();
      expect(authManager.acquireTokenByDeviceCode).toHaveBeenCalled();
      expect(result.content[0].text).toBe('Login instructions');
    });

    it('should proceed with login when not already logged in', async () => {
      authManager.testLogin.mockResolvedValue({
        success: false,
        message: 'Not logged in',
      });

      authManager.acquireTokenByDeviceCode.mockImplementation(
        (callback: (text: string) => void) => {
          callback('Login instructions');
          return Promise.resolve();
        }
      );

      const result = await loginTool({ force: false });

      expect(authManager.testLogin).toHaveBeenCalled();
      expect(authManager.acquireTokenByDeviceCode).toHaveBeenCalled();
      expect(result.content[0].text).toBe('Login instructions');
    });
  });
});
