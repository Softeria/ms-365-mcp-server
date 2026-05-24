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
  let authManager: {
    logout: ReturnType<typeof vi.fn>;
    testLogin: ReturnType<typeof vi.fn>;
    acquireTokenByDeviceCode: ReturnType<typeof vi.fn>;
    getUseInteractiveAuth: ReturnType<typeof vi.fn>;
    acquireTokenInteractive: ReturnType<typeof vi.fn>;
    hasExpectedAccount: ReturnType<typeof vi.fn>;
  };
  let loginTool: ReturnType<typeof vi.fn>;
  let verifyLoginTool: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loginTool = vi.fn();
    verifyLoginTool = vi.fn();

    server = {
      tool: vi.fn((name, description, schema, handler) => {
        if (name === 'login') {
          loginTool = handler;
        }
        if (name === 'verify-login') {
          verifyLoginTool = handler;
        }
      }),
    };

    authManager = {
      testLogin: vi.fn(),
      acquireTokenByDeviceCode: vi.fn(),
      getUseInteractiveAuth: vi.fn().mockReturnValue(false),
      acquireTokenInteractive: vi.fn().mockResolvedValue(undefined),
      hasExpectedAccount: vi.fn().mockReturnValue(false),
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
      expect(result.content[0].text).toBe(
        JSON.stringify({
          error: 'device_code_required',
          message: 'Login instructions',
        })
      );
    });

    it('should use interactive browser auth when authBrowser mode is enabled', async () => {
      authManager.getUseInteractiveAuth.mockReturnValue(true);
      authManager.testLogin
        .mockResolvedValueOnce({ success: false, message: 'Not logged in' })
        .mockResolvedValueOnce({
          success: true,
          userData: { displayName: 'Browser User' },
        });

      const result = await loginTool({ force: false });

      expect(authManager.acquireTokenInteractive).toHaveBeenCalled();
      expect(authManager.acquireTokenByDeviceCode).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('Login successful');
      expect(result.content[0].text).toContain('Browser authentication completed');
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
      expect(result.content[0].text).toBe(
        JSON.stringify({
          error: 'device_code_required',
          message: 'Login instructions',
        })
      );
    });

    it('should proceed with login when expected account is missing', async () => {
      authManager.testLogin.mockResolvedValue({
        success: false,
        message: 'Expected Microsoft account not found in token cache.',
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
      expect(result.content[0].text).toContain('device_code_required');
    });
  });

  describe('verify-login tool', () => {
    it('should return JSON failure when verification throws', async () => {
      authManager.testLogin.mockRejectedValue(new Error('Expected Microsoft account missing'));

      const result = await verifyLoginTool({});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({
        success: false,
        message: 'Login failed: Expected Microsoft account missing',
      });
      expect(result.isError).toBeUndefined();
    });
  });
});
