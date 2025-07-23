import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

global.fetch = vi.fn();

describe('Graph API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ value: 'test data' }),
      text: async () => 'Error text',
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createSession', () => {
    async function createSession(filePath: string, token: string): Promise<string | null> {
      try {
        const response = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/root:${filePath}:/workbook/createSession`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ persistChanges: true }),
          }
        );

        if (!response.ok) {
          return null;
        }

        const result = await response.json();
        return result.id;
      } catch {
        return null;
      }
    }

    it('should create a session successfully', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ id: 'session-123' }),
      }));

      const result = await createSession('/test.xlsx', 'mock-token');

      expect(result).toBe('session-123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me/drive/root:/test.xlsx:/workbook/createSession',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });

    it('should return null if session creation fails', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(async () => ({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      }));

      const result = await createSession('/test.xlsx', 'mock-token');

      expect(result).toBeNull();
    });

    it('should return null if an error is thrown', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      const result = await createSession('/test.xlsx', 'mock-token');

      expect(result).toBeNull();
    });
  });
});
