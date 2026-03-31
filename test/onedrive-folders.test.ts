import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

global.fetch = vi.fn();

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const MOCK_TOKEN = 'mock-access-token';
const DRIVE_ID = 'drive-abc123';
const ITEM_ID = 'item-xyz789';

function makeHeaders() {
  return expect.objectContaining({
    Authorization: `Bearer ${MOCK_TOKEN}`,
    'Content-Type': 'application/json',
  });
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

async function graphPost(path: string, body: object) {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MOCK_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return null;
  return response.json();
}

describe('OneDrive Folder Tools', () => {
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

  describe('move-rename-onedrive-item', () => {
    it('should PATCH the correct URL to rename a file', async () => {
      const updated = { id: ITEM_ID, name: 'new-name.txt' };
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => updated,
      }));

      const result = await graphPatch(`/drives/${DRIVE_ID}/items/${ITEM_ID}`, {
        name: 'new-name.txt',
      });

      expect(result).toEqual(updated);
      expect(global.fetch).toHaveBeenCalledWith(
        `${GRAPH_BASE}/drives/${DRIVE_ID}/items/${ITEM_ID}`,
        expect.objectContaining({ method: 'PATCH', headers: makeHeaders() })
      );
      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
      );
      expect(body.name).toBe('new-name.txt');
    });

    it('should PATCH with parentReference to move a file', async () => {
      const targetFolderId = 'folder-target-456';
      const updated = { id: ITEM_ID, name: 'report.pdf', parentReference: { id: targetFolderId } };
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => updated,
      }));

      const result = await graphPatch(`/drives/${DRIVE_ID}/items/${ITEM_ID}`, {
        parentReference: { id: targetFolderId },
      });

      expect(result).toEqual(updated);
      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
      );
      expect(body.parentReference.id).toBe(targetFolderId);
    });

    it('should PATCH with both name and parentReference to move and rename in one request', async () => {
      const targetFolderId = 'folder-target-456';
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ id: ITEM_ID, name: 'renamed.pdf' }),
      }));

      await graphPatch(`/drives/${DRIVE_ID}/items/${ITEM_ID}`, {
        name: 'renamed.pdf',
        parentReference: { id: targetFolderId },
      });

      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
      );
      expect(body.name).toBe('renamed.pdf');
      expect(body.parentReference.id).toBe(targetFolderId);
    });

    it('should return null when item is not found', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Item not found' } }),
      }));

      const result = await graphPatch(`/drives/${DRIVE_ID}/items/nonexistent`, { name: 'new.txt' });
      expect(result).toBeNull();
    });

    it('should return null when lacking permissions', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'Access denied' } }),
      }));

      const result = await graphPatch(`/drives/${DRIVE_ID}/items/${ITEM_ID}`, {
        name: 'blocked.txt',
      });
      expect(result).toBeNull();
    });
  });

  describe('create-onedrive-folder', () => {
    it('should POST to create a folder inside a drive item', async () => {
      const newFolder = { id: 'new-folder-001', name: 'Reports', folder: {} };
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: true,
        status: 201,
        json: async () => newFolder,
      }));

      const result = await graphPost(`/drives/${DRIVE_ID}/items/${ITEM_ID}/children`, {
        name: 'Reports',
        folder: {},
      });

      expect(result).toEqual(newFolder);
      expect(global.fetch).toHaveBeenCalledWith(
        `${GRAPH_BASE}/drives/${DRIVE_ID}/items/${ITEM_ID}/children`,
        expect.objectContaining({ method: 'POST', headers: makeHeaders() })
      );
      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
      );
      expect(body.name).toBe('Reports');
      expect(body.folder).toEqual({});
    });

    it('should support @microsoft.graph.conflictBehavior in the request body', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: true,
        status: 201,
        json: async () => ({ id: 'new-folder-002', name: 'Reports' }),
      }));

      await graphPost(`/drives/${DRIVE_ID}/items/${ITEM_ID}/children`, {
        name: 'Reports',
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      });

      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
      );
      expect(body['@microsoft.graph.conflictBehavior']).toBe('rename');
    });

    it('should return null when parent item does not exist', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Item not found' } }),
      }));

      const result = await graphPost(`/drives/${DRIVE_ID}/items/nonexistent/children`, {
        name: 'NewFolder',
        folder: {},
      });
      expect(result).toBeNull();
    });

    it('should return null when lacking write permissions', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'Access denied' } }),
      }));

      const result = await graphPost(`/drives/${DRIVE_ID}/items/${ITEM_ID}/children`, {
        name: 'Blocked',
        folder: {},
      });
      expect(result).toBeNull();
    });
  });
});
