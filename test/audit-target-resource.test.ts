import { describe, expect, it } from 'vitest';
import { deriveTargetResource, resolveGraphPathForAudit } from '../src/audit-target-resource.js';

describe('audit target-resource derivation', () => {
  it('derives a SharePoint site target from the last ID path parameter', () => {
    expect(
      deriveTargetResource({
        pathPattern: '/sites/{site-id}:/{path}',
        params: {
          siteId: 'contoso.sharepoint.com',
          path: '/sites/Finance',
        },
      })
    ).toEqual({
      type: 'site',
      id: '/sites/contoso.sharepoint.com',
    });
  });

  it('derives a drive item target from camelCase params', () => {
    expect(
      deriveTargetResource({
        pathPattern: '/drives/{drive-id}/items/{driveItem-id}',
        params: {
          driveId: 'drive-1',
          driveItemId: 'item-2',
        },
      })
    ).toEqual({
      type: 'drive_item',
      id: '/drives/drive-1/items/item-2',
    });
  });

  it('records nested drive item endpoints as the parent drive item', () => {
    expect(
      deriveTargetResource({
        pathPattern: '/drives/{drive-id}/items/{driveItem-id}/versions',
        params: {
          driveId: 'drive-1',
          driveItemId: 'item-2',
        },
      })
    ).toEqual({
      type: 'drive_item',
      id: '/drives/drive-1/items/item-2',
    });
  });

  it('records drive content endpoints as the parent drive item', () => {
    expect(
      deriveTargetResource({
        pathPattern: '/drives/{drive-id}/items/{driveItem-id}/content',
        params: {
          driveId: 'drive-1',
          driveItemId: 'item-2',
        },
      })
    ).toEqual({
      type: 'drive_item',
      id: '/drives/drive-1/items/item-2',
    });
  });

  it('omits drive path content endpoints because they can contain filenames', () => {
    expect(
      deriveTargetResource({
        pathPattern: '/me/drive/root:/{path}:/content',
        params: {
          path: 'Project/report.docx',
        },
      })
    ).toBeUndefined();
  });

  it('derives mail message targets', () => {
    expect(
      deriveTargetResource({
        pathPattern: '/me/messages/{message-id}',
        params: {
          messageId: 'message-1',
        },
      })
    ).toEqual({
      type: 'message',
      id: '/me/messages/message-1',
    });
  });

  it('records mail attachment value endpoints as the parent attachment', () => {
    expect(
      deriveTargetResource({
        pathPattern: '/me/messages/{message-id}/attachments/{attachment-id}/$value',
        params: {
          messageId: 'message-1',
          attachmentId: 'attachment-2',
        },
      })
    ).toEqual({
      type: 'attachment',
      id: '/me/messages/message-1/attachments/attachment-2',
    });
  });

  it('derives Planner task targets', () => {
    expect(
      deriveTargetResource({
        pathPattern: '/planner/tasks/{plannerTask-id}',
        params: { plannerTaskId: 'task-123' },
      })
    ).toEqual({
      type: 'planner_task',
      id: '/planner/tasks/task-123',
    });
  });

  it('omits a target resource for broad list/search calls', () => {
    expect(
      deriveTargetResource({
        pathPattern: '/me/messages',
        params: { search: 'budget' },
      })
    ).toBeUndefined();
  });

  it('omits a target resource when the ID parameter is missing', () => {
    expect(
      deriveTargetResource({
        pathPattern: '/drives/{drive-id}/items/{driveItem-id}',
        params: {
          driveId: 'drive-1',
        },
      })
    ).toBeUndefined();
  });

  it('resolves path templates from kebab-case and camelCase params', () => {
    expect(
      resolveGraphPathForAudit('/drives/{drive-id}/items/:driveItemId', {
        driveId: 'drive-1',
        'drive-item-id': 'item-2',
      })
    ).toBe('/drives/drive-1/items/item-2');
  });
});
