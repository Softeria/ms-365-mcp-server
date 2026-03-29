/**
 * Custom Excel write tools that provide range writing, row appending,
 * and range clearing with auto-detection of the last used row.
 *
 * These go beyond the generic data-driven endpoints because they
 * require multi-step logic (e.g., finding the last used row before appending).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import GraphClient from '../graph-client.js';
import logger from '../logger.js';

// ─── Helpers ───────────────────────────────────────────────────────────────────

interface DriveItemInfo {
  id: string;
  name: string;
}

function validateItemId(itemId: string): string {
  if (!/^[A-Za-z0-9!_=-]+$/.test(itemId)) {
    throw new Error('Invalid itemId format');
  }
  return itemId;
}

function validatePath(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error('Path must be absolute (start with /)');
  }
  if (path.includes('..')) {
    throw new Error('Path cannot contain ".." segments');
  }
  return path;
}

async function resolveDriveItem(
  graphClient: GraphClient,
  path?: string,
  itemId?: string
): Promise<DriveItemInfo> {
  const endpoint = itemId
    ? `/me/drive/items/${validateItemId(itemId)}`
    : `/me/drive/root:${validatePath(path!)}`;
  return (await graphClient.makeRequest(endpoint + '?$select=id,name')) as DriveItemInfo;
}

/** URL-encode a value and also escape single quotes for use in Graph API path segments. */
function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(/'/g, '%27');
}

function colToLetter(index: number): string {
  let letter = '';
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

// ─── Tool registration ─────────────────────────────────────────────────────────

export function registerExcelWriteTools(
  server: McpServer,
  graphClient: GraphClient,
  readOnly: boolean = false,
  enabledToolsRegex?: RegExp
): number {
  // Skip all write tools in read-only mode
  if (readOnly) {
    logger.info('Excel write tools: skipped (read-only mode)');
    return 0;
  }

  let count = 0;

  // ── write-excel-range ────────────────────────────────────────────────────────

  if (!enabledToolsRegex || enabledToolsRegex.test('write-excel-range')) {
    server.tool(
      'write-excel-range',
      `Write values to a specific cell range in an Excel worksheet.\nOverwrites existing cell values in the target range. Read the range first with get-excel-range to confirm current values before overwriting.\n\nArgs:\n  - path: File path \u2014 use this OR itemId\n  - itemId: OneDrive item ID \u2014 use this OR path\n  - sheetName: Worksheet name (get from list-excel-worksheets)\n  - range: Top-left cell or full range e.g. "A1", "B2:D4"\n  - values: 2D array \u2014 each inner array is one row. Example: [["Name","Score"],["Alice",95],["Bob",87]]\n\nReturns: Confirmation with the range written.\n\nCAUTION: Overwrites existing data. Always read the target range first.`,
      {
        path: z.string().describe('File path').optional(),
        itemId: z.string().describe('OneDrive item ID').optional(),
        sheetName: z.string().describe('Worksheet name'),
        range: z.string().describe('Top-left cell or range e.g. "A1" or "B2:D5"'),
        values: z
          .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
          .min(1)
          .describe('2D array of values \u2014 each inner array is one row'),
      },
      {
        title: 'write-excel-range',
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      },
      async ({ path, itemId, sheetName, range, values }) => {
        if (!path && !itemId) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Provide path or itemId' }) }],
            isError: true,
          };
        }
        try {
          const item = await resolveDriveItem(graphClient, path, itemId);
          const sheetRef = encodePathSegment(sheetName);
          const rangeRef = encodePathSegment(range);

          const result = (await graphClient.makeRequest(
            `/me/drive/items/${item.id}/workbook/worksheets('${sheetRef}')/range(address='${rangeRef}')`,
            { method: 'PATCH', body: JSON.stringify({ values }) }
          )) as { address: string };

          const rowWord = values.length === 1 ? 'row' : 'rows';
          const colWord = values[0].length === 1 ? 'column' : 'columns';

          return {
            content: [
              {
                type: 'text',
                text: `Written ${values.length} ${rowWord} x ${values[0].length} ${colWord} to "${sheetName}" at ${result.address} in "${item.name}".`,
              },
            ],
          };
        } catch (error) {
          logger.error(`write-excel-range error: ${(error as Error).message}`);
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to write Excel range. Check the path, sheet name, and range.' }) }],
            isError: true,
          };
        }
      }
    );
    count++;
  }

  // ── append-excel-rows ────────────────────────────────────────────────────────

  if (!enabledToolsRegex || enabledToolsRegex.test('append-excel-rows')) {
    server.tool(
      'append-excel-rows',
      `Append one or more rows immediately after the last row of existing data in a worksheet.\nDetects the last used row automatically \u2014 no need to specify where to write.\nIdeal for logging, adding new records, or extending a table.\n\nArgs:\n  - path: File path \u2014 use this OR itemId\n  - itemId: OneDrive item ID \u2014 use this OR path\n  - sheetName: Worksheet name\n  - rows: 2D array \u2014 each inner array is one row to append. Must match the column count of existing data.\n  - startCol: Column letter where data starts (default: "A")\n\nReturns: Confirmation with the range written and next available empty row.`,
      {
        path: z.string().describe('File path').optional(),
        itemId: z.string().describe('OneDrive item ID').optional(),
        sheetName: z.string().describe('Worksheet name'),
        rows: z
          .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
          .min(1)
          .describe('2D array of rows to append'),
        startCol: z
          .string()
          .regex(/^[A-Za-z]{1,3}$/, 'startCol must be 1-3 letters (A-XFD)')
          .default('A')
          .describe('Starting column letter(s) e.g. "A", "AA" (default: "A")')
          .optional(),
      },
      {
        title: 'append-excel-rows',
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      },
      async ({ path, itemId, sheetName, rows, startCol }) => {
        if (!path && !itemId) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Provide path or itemId' }) }],
            isError: true,
          };
        }
        try {
          const col = startCol ?? 'A';
          const item = await resolveDriveItem(graphClient, path, itemId);
          const sheetRef = encodePathSegment(sheetName);

          // Find the last used row
          const usedRange = (await graphClient.makeRequest(
            `/me/drive/items/${item.id}/workbook/worksheets('${sheetRef}')/usedRange?$select=rowCount,columnCount`
          )) as { rowCount: number; columnCount: number };

          const nextRow = usedRange.rowCount + 1;
          const colStart = col.toUpperCase();
          // Convert column letters to 0-based index (A=0, Z=25, AA=26, etc.)
          let colStartIdx = 0;
          for (const ch of colStart) {
            colStartIdx = colStartIdx * 26 + (ch.charCodeAt(0) - 64);
          }
          colStartIdx -= 1; // Convert to 0-based
          const endCol = colToLetter(colStartIdx + rows[0].length - 1);
          const writeRange = `${colStart}${nextRow}:${endCol}${nextRow + rows.length - 1}`;
          const rangeRef = encodePathSegment(writeRange);

          const result = (await graphClient.makeRequest(
            `/me/drive/items/${item.id}/workbook/worksheets('${sheetRef}')/range(address='${rangeRef}')`,
            { method: 'PATCH', body: JSON.stringify({ values: rows }) }
          )) as { address: string };

          const rowWord = rows.length === 1 ? 'row' : 'rows';
          return {
            content: [
              {
                type: 'text',
                text: `Appended ${rows.length} ${rowWord} to "${sheetName}" at ${result.address} in "${item.name}". Next empty row: ${nextRow + rows.length}.`,
              },
            ],
          };
        } catch (error) {
          logger.error(`append-excel-rows error: ${(error as Error).message}`);
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to append rows. Check the path, sheet name, and data format.' }) }],
            isError: true,
          };
        }
      }
    );
    count++;
  }

  // ── clear-excel-range ────────────────────────────────────────────────────────

  if (!enabledToolsRegex || enabledToolsRegex.test('clear-excel-range')) {
    server.tool(
      'clear-excel-range',
      `Clear the contents of a cell range in an Excel worksheet.\nRemoves values but preserves cell formatting (borders, colors, number formats) by default.\nSet clearFormat=true to also wipe formatting.\n\nArgs:\n  - path: File path \u2014 use this OR itemId\n  - itemId: OneDrive item ID \u2014 use this OR path\n  - sheetName: Worksheet name\n  - range: Range to clear e.g. "A2:D10"\n  - clearFormat: Also clear formatting (default: false)\n\nReturns: Confirmation of the cleared range.\n\nCAUTION: Permanently removes cell values. Read range first to confirm.`,
      {
        path: z.string().describe('File path').optional(),
        itemId: z.string().describe('OneDrive item ID').optional(),
        sheetName: z.string().describe('Worksheet name'),
        range: z.string().describe('Range to clear e.g. "A2:D10"'),
        clearFormat: z
          .boolean()
          .default(false)
          .describe('Also clear formatting (default: false)')
          .optional(),
      },
      {
        title: 'clear-excel-range',
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      },
      async ({ path, itemId, sheetName, range, clearFormat }) => {
        if (!path && !itemId) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Provide path or itemId' }) }],
            isError: true,
          };
        }
        try {
          const item = await resolveDriveItem(graphClient, path, itemId);
          const sheetRef = encodePathSegment(sheetName);
          const rangeRef = encodePathSegment(range);
          const clearType = clearFormat ? 'All' : 'Contents';

          await graphClient.makeRequest(
            `/me/drive/items/${item.id}/workbook/worksheets('${sheetRef}')/range(address='${rangeRef}')/clear`,
            { method: 'POST', body: JSON.stringify({ applyTo: clearType }) }
          );

          return {
            content: [
              {
                type: 'text',
                text: `Cleared ${clearFormat ? 'contents and formatting' : 'contents'} of "${range}" in sheet "${sheetName}" in "${item.name}".`,
              },
            ],
          };
        } catch (error) {
          logger.error(`clear-excel-range error: ${(error as Error).message}`);
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to clear range. Check the path, sheet name, and range.' }) }],
            isError: true,
          };
        }
      }
    );
    count++;
  }

  // ── create-workbook ─────────────────────────────────────────────────────────

  if (!enabledToolsRegex || enabledToolsRegex.test('create-workbook')) {
    // Minimal valid empty .xlsx (contains one blank Sheet1)
    const EMPTY_XLSX_B64 =
      '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';

    server.tool(
      'create-workbook',
      `Create a new empty Excel workbook (.xlsx) in OneDrive.\nCreates a file with one blank worksheet (Sheet1) that you can then populate using write-excel-range or append-excel-rows.\n\nArgs:\n  - fileName: Name for the file (must end with .xlsx)\n  - folderPath: Folder path e.g. "/" for root, "/Documents/Reports" (default: "/")\n\nReturns: Item ID and name of the created workbook.`,
      {
        fileName: z.string().regex(/\.xlsx$/i, 'File name must end with .xlsx').describe('File name e.g. "Budget.xlsx"'),
        folderPath: z.string().default('/').describe('Folder path e.g. "/" or "/Documents" (default: root)').optional(),
      },
      {
        title: 'create-workbook',
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      },
      async ({ fileName, folderPath }) => {
        try {
          const folder = folderPath && folderPath !== '/' ? folderPath : '';
          const uploadPath = `${folder}/${fileName}`.replace(/\/+/g, '/');
          const endpoint = `/me/drive/root:${validatePath(uploadPath)}:/content`;

          const xlsxBuffer = Buffer.from(EMPTY_XLSX_B64, 'base64');
          const result = (await graphClient.makeRequest(endpoint, {
            method: 'PUT',
            body: xlsxBuffer as any,
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          })) as { id: string; name: string; webUrl?: string };

          return {
            content: [
              {
                type: 'text',
                text: `Created workbook "${result.name}" (ID: ${result.id}).${result.webUrl ? ` Open in browser: ${result.webUrl}` : ''}\n\nUse write-excel-range with itemId="${result.id}" and sheetName="Sheet1" to add data.`,
              },
            ],
          };
        } catch (error) {
          logger.error(`create-workbook error: ${(error as Error).message}`);
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to create workbook. Check the file name and folder path.' }) }],
            isError: true,
          };
        }
      }
    );
    count++;
  }

  logger.info(`Excel write tools: ${count} registered`);
  return count;
}
