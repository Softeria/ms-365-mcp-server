import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import AuthManager from './auth.js';
import GraphClient from './graph-client.js';
import { getRequestTokens } from './request-context.js';

const excelCellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const excelRowsSchema = z
  .array(z.array(excelCellSchema))
  .min(1)
  .describe('Two-dimensional array of Excel cell values');
const excelSheetSchema = z.object({
  name: z.string().min(1).max(31).describe('Worksheet name. Excel limits names to 31 characters.'),
  rows: excelRowsSchema,
});

function normalizeRows(
  rows: Array<Array<string | number | boolean | null>>
): Array<Array<string | number | boolean>> {
  return rows.map((row) => row.map((value) => (value === null ? '' : value)));
}

function encodeDrivePath(filePath: string): string {
  return filePath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

async function resolveAccessToken(authManager: AuthManager, account?: string): Promise<string> {
  const requestTokens = getRequestTokens();
  if (requestTokens?.accessToken) {
    return requestTokens.accessToken;
  }

  return authManager.getTokenForAccount(account);
}

export function registerCustomExcelTools(
  server: McpServer,
  graphClient: GraphClient,
  authManager: AuthManager,
  readOnly: boolean = false
): number {
  if (readOnly) {
    return 0;
  }

  let registeredCount = 0;

  server.tool(
    'create-excel-workbook',
    'Create a new Excel workbook in OneDrive from sheet data supplied as arrays of rows and cells.',
    {
      driveId: z.string().describe('OneDrive drive ID that will store the workbook'),
      filePath: z
        .string()
        .min(1)
        .describe('Path under the drive root, for example Reports/Behringer-WING.xlsx'),
      sheets: z.array(excelSheetSchema).min(1).describe('Sheets to create in the new workbook'),
      account: z
        .string()
        .optional()
        .describe('Microsoft account email to use when multiple cached accounts exist'),
      includeHeaders: z.boolean().optional().describe('Include response headers in metadata'),
      excludeResponse: z
        .boolean()
        .optional()
        .describe('Exclude the full response body and only return success or failure'),
    },
    {
      title: 'create-excel-workbook',
      destructiveHint: false,
      openWorldHint: true,
      readOnlyHint: false,
    },
    async ({ driveId, filePath, sheets, account, includeHeaders, excludeResponse }) => {
      const workbook = XLSX.utils.book_new();

      for (const sheet of sheets) {
        const worksheet = XLSX.utils.aoa_to_sheet(normalizeRows(sheet.rows));
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
      }

      const workbookBuffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      }) as Buffer;

      const accessToken = await resolveAccessToken(authManager, account);
      const endpoint = `/drives/${encodeURIComponent(driveId)}/items/root:/${encodeDrivePath(filePath)}:/content`;

      return graphClient.graphRequest(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        body: workbookBuffer,
        accessToken,
        includeHeaders,
        excludeResponse,
      });
    }
  );
  registeredCount++;

  server.tool(
    'update-excel-range',
    'Write cell values into an existing workbook range.',
    {
      driveId: z.string().describe('OneDrive drive ID that contains the workbook'),
      driveItemId: z.string().describe('Drive item ID for the workbook file'),
      workbookWorksheetId: z
        .string()
        .describe('Worksheet ID from list-excel-worksheets for the target sheet'),
      address: z.string().describe("A1-style range address, for example A1:D12 or 'Sheet 1'!A1:C5"),
      values: excelRowsSchema.describe('Two-dimensional array of values to write into the range'),
      account: z
        .string()
        .optional()
        .describe('Microsoft account email to use when multiple cached accounts exist'),
      includeHeaders: z.boolean().optional().describe('Include response headers in metadata'),
      excludeResponse: z
        .boolean()
        .optional()
        .describe('Exclude the full response body and only return success or failure'),
    },
    {
      title: 'update-excel-range',
      destructiveHint: false,
      openWorldHint: true,
      readOnlyHint: false,
    },
    async ({
      driveId,
      driveItemId,
      workbookWorksheetId,
      address,
      values,
      account,
      includeHeaders,
      excludeResponse,
    }) => {
      const accessToken = await resolveAccessToken(authManager, account);
      const endpoint =
        `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(driveItemId)}` +
        `/workbook/worksheets/${encodeURIComponent(workbookWorksheetId)}` +
        `/range(address='${address}')`;

      return graphClient.graphRequest(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({ values: normalizeRows(values) }),
        accessToken,
        includeHeaders,
        excludeResponse,
      });
    }
  );
  registeredCount++;

  server.tool(
    'create-excel-worksheet',
    'Create a new worksheet in an existing workbook.',
    {
      driveId: z.string().describe('OneDrive drive ID that contains the workbook'),
      driveItemId: z.string().describe('Drive item ID for the workbook file'),
      name: z
        .string()
        .min(1)
        .max(31)
        .describe('Worksheet name. Excel limits names to 31 characters.'),
      account: z
        .string()
        .optional()
        .describe('Microsoft account email to use when multiple cached accounts exist'),
      includeHeaders: z.boolean().optional().describe('Include response headers in metadata'),
      excludeResponse: z
        .boolean()
        .optional()
        .describe('Exclude the full response body and only return success or failure'),
    },
    {
      title: 'create-excel-worksheet',
      destructiveHint: false,
      openWorldHint: true,
      readOnlyHint: false,
    },
    async ({ driveId, driveItemId, name, account, includeHeaders, excludeResponse }) => {
      const accessToken = await resolveAccessToken(authManager, account);
      const endpoint =
        `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(driveItemId)}` +
        '/workbook/worksheets/add';

      return graphClient.graphRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ name }),
        accessToken,
        includeHeaders,
        excludeResponse,
      });
    }
  );
  registeredCount++;

  return registeredCount;
}
