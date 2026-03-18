import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

global.fetch = vi.fn();

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const MOCK_TOKEN = 'mock-access-token';

function makeHeaders() {
  return expect.objectContaining({
    Authorization: `Bearer ${MOCK_TOKEN}`,
    'Content-Type': 'application/json',
  });
}

async function graphPost(path: string, body: object) {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MOCK_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return null;
  return response.json();
}

async function graphPatch(path: string, body: object) {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${MOCK_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return null;
  return response.json();
}

async function graphDelete(path: string) {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${MOCK_TOKEN}`, 'Content-Type': 'application/json' },
  });
  return response.ok;
}

describe('Mail Folder Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create-mail-folder', () => {
    it('should POST to /me/mailFolders with displayName', async () => {
      const folder = { id: 'folder-123', displayName: 'Work', childFolderCount: 0 };
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: true,
        status: 201,
        json: async () => folder,
      }));

      const result = await graphPost('/me/mailFolders', { displayName: 'Work' });

      expect(result).toEqual(folder);
      expect(global.fetch).toHaveBeenCalledWith(
        `${GRAPH_BASE}/me/mailFolders`,
        expect.objectContaining({ method: 'POST', headers: makeHeaders() })
      );
      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
      );
      expect(body.displayName).toBe('Work');
    });

    it('should support isHidden flag for hidden folder creation', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: true,
        status: 201,
        json: async () => ({ id: 'hidden-123', displayName: 'HiddenFolder', isHidden: true }),
      }));

      await graphPost('/me/mailFolders', { displayName: 'HiddenFolder', isHidden: true });

      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
      );
      expect(body.isHidden).toBe(true);
    });

    it('should return null when creation fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Bad request' } }),
      }));

      const result = await graphPost('/me/mailFolders', { displayName: '' });
      expect(result).toBeNull();
    });
  });

  describe('create-mail-child-folder', () => {
    const PARENT_ID = 'parent-folder-id';

    it('should POST to /me/mailFolders/{id}/childFolders with displayName', async () => {
      const child = { id: 'child-456', displayName: 'Subproject', childFolderCount: 0 };
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: true,
        status: 201,
        json: async () => child,
      }));

      const result = await graphPost(`/me/mailFolders/${PARENT_ID}/childFolders`, {
        displayName: 'Subproject',
      });

      expect(result).toEqual(child);
      expect(global.fetch).toHaveBeenCalledWith(
        `${GRAPH_BASE}/me/mailFolders/${PARENT_ID}/childFolders`,
        expect.objectContaining({ method: 'POST', headers: makeHeaders() })
      );
      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
      );
      expect(body.displayName).toBe('Subproject');
    });

    it('should return null when parent folder does not exist', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'The specified folder does not exist.' } }),
      }));

      const result = await graphPost(`/me/mailFolders/nonexistent/childFolders`, {
        displayName: 'Child',
      });
      expect(result).toBeNull();
    });
  });

  describe('update-mail-folder', () => {
    const FOLDER_ID = 'folder-to-rename';

    it('should PATCH /me/mailFolders/{id} with new displayName', async () => {
      const updated = { id: FOLDER_ID, displayName: 'Renamed Folder' };
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => updated,
      }));

      const result = await graphPatch(`/me/mailFolders/${FOLDER_ID}`, {
        displayName: 'Renamed Folder',
      });

      expect(result).toEqual(updated);
      expect(global.fetch).toHaveBeenCalledWith(
        `${GRAPH_BASE}/me/mailFolders/${FOLDER_ID}`,
        expect.objectContaining({ method: 'PATCH', headers: makeHeaders() })
      );
      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
      );
      expect(body.displayName).toBe('Renamed Folder');
    });

    it('should return null when folder is not found', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Resource not found' } }),
      }));

      const result = await graphPatch('/me/mailFolders/nonexistent', { displayName: 'New Name' });
      expect(result).toBeNull();
    });
  });

  describe('delete-mail-folder', () => {
    const FOLDER_ID = 'folder-to-delete';

    it('should DELETE /me/mailFolders/{id} and return true on success', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: true,
        status: 204,
        json: async () => ({}),
        text: async () => '',
      }));

      const result = await graphDelete(`/me/mailFolders/${FOLDER_ID}`);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `${GRAPH_BASE}/me/mailFolders/${FOLDER_ID}`,
        expect.objectContaining({ method: 'DELETE', headers: makeHeaders() })
      );
    });

    it('should return false when folder cannot be deleted', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      }));

      const result = await graphDelete(`/me/mailFolders/${FOLDER_ID}`);
      expect(result).toBe(false);
    });

    it('should return false when folder does not exist', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: false,
        status: 404,
        text: async () => 'Not found',
      }));

      const result = await graphDelete('/me/mailFolders/nonexistent');
      expect(result).toBe(false);
    });
  });
});
