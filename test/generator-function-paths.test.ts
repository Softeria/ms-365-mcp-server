import { describe, it, expect } from 'vitest';
// @ts-expect-error - generator module is plain JS with no type declarations
import { fixFunctionStylePaths } from '../bin/modules/generate-mcp-tools.mjs';

// openapi-zod-client emits every path as a single-quoted string. Function-style OData
// segments with quoted parameters (range(address='{address}')) therefore end up with
// single quotes nested inside single quotes, which is a TypeScript syntax error. The
// generator rewrites those paths as template literals.

describe('fixFunctionStylePaths', () => {
  it('converts a path with one quoted function parameter', () => {
    const input = `    path: '/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address=':address')',`;
    expect(fixFunctionStylePaths(input)).toBe(
      `    path: \`/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address=':address')\`,`
    );
  });

  // Before this was fixed, a quoted parameter followed by further parameters was left
  // untouched and the generated client failed to compile (TS1005 "',' expected").
  it('converts a path where further parameters follow the quoted one', () => {
    const input = `    path: '/me/adhocCalls/getAllTranscripts(userId=':userId',startDateTime=:startDateTime,endDateTime=:endDateTime)',`;
    expect(fixFunctionStylePaths(input)).toBe(
      `    path: \`/me/adhocCalls/getAllTranscripts(userId=':userId',startDateTime=:startDateTime,endDateTime=:endDateTime)\`,`
    );
  });

  it('converts a quoted parameter in the middle of the path', () => {
    const input = `    path: '/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address=':address')/format/font',`;
    expect(fixFunctionStylePaths(input)).toBe(
      `    path: \`/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address=':address')/format/font\`,`
    );
  });

  it('leaves function paths without quoted parameters alone', () => {
    const input = `    path: '/drives/:driveId/items/:driveItemId/workbook/tables/:workbookTableId/rows/itemAt(index=:index)',`;
    expect(fixFunctionStylePaths(input)).toBe(input);
  });

  it('leaves plain paths alone', () => {
    const input = `    path: '/me/onlineMeetings/:onlineMeetingId/transcripts/:callTranscriptId/content',`;
    expect(fixFunctionStylePaths(input)).toBe(input);
  });
});
