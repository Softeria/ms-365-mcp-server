import { describe, expect, it } from 'vitest';
import { deriveTargetResource, resolveGraphPathForAudit } from '../src/audit-target-resource.js';

describe('audit target-resource derivation', () => {
  it('derives a SharePoint site target from a path template', () => {
    expect(
      deriveTargetResource({
        pathPattern: '/sites/{hostname}:/{site-path}',
        params: {
          hostname: 'contoso.sharepoint.com',
          sitePath: '/sites/Finance',
        },
      })
    ).toEqual({
      type: 'sharepoint_site',
      id: '/sites/contoso.sharepoint.com:/%2Fsites%2FFinance',
    });
  });

  it('derives a drive item target and strips query strings', () => {
    expect(
      deriveTargetResource({
        resolvedPath: '/drives/drive-1/items/item-2?$select=id,name',
      })
    ).toEqual({
      type: 'drive_item',
      id: '/drives/drive-1/items/item-2',
    });
  });

  it('records nested drive item endpoints as the parent drive item', () => {
    expect(
      deriveTargetResource({
        resolvedPath: '/drives/drive-1/items/item-2/versions',
      })
    ).toEqual({
      type: 'drive_item',
      id: '/drives/drive-1/items/item-2',
    });
  });

  it('records drive content endpoints as the parent drive item', () => {
    expect(
      deriveTargetResource({
        resolvedPath: '/drives/drive-1/items/item-2/content',
      })
    ).toEqual({
      type: 'drive_item',
      id: '/drives/drive-1/items/item-2',
    });
  });

  it('records drive path content endpoints as the parent drive item path', () => {
    expect(
      deriveTargetResource({
        resolvedPath: '/me/drive/root:/Project/report.docx:/content',
      })
    ).toEqual({
      type: 'drive_item',
      id: '/me/drive/root:/Project/report.docx:',
    });
  });

  it('records mail attachment value endpoints as the parent attachment', () => {
    expect(
      deriveTargetResource({
        resolvedPath: '/me/messages/message-1/attachments/attachment-2/$value',
      })
    ).toEqual({
      type: 'mail_attachment',
      id: '/me/messages/message-1/attachments/attachment-2',
    });
  });

  it('derives Planner task targets', () => {
    expect(
      deriveTargetResource({
        pathPattern: '/planner/tasks/:plannerTaskId',
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
        resolvedPath: '/me/messages?$search=%22budget%22',
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
