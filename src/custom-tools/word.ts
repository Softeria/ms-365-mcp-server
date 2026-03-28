/**
 * Custom Word document tools that provide structured document reading,
 * outline extraction, and in-document search via the Graph API's HTML
 * conversion endpoint.
 *
 * These tools go beyond the generic data-driven endpoints because they
 * require post-processing (HTML-to-structured-text parsing).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import GraphClient from '../graph-client.js';
import logger from '../logger.js';

const CHARACTER_LIMIT = 50_000;

// ─── HTML parsing helpers ──────────────────────────────────────────────────────

interface WordSection {
  heading: string;
  level: number;
  content: string;
}

function decodeHtmlEntities(text: string): string {
  return text
    // Named entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&copy;/g, '\u00a9')
    .replace(/&reg;/g, '\u00ae')
    .replace(/&trade;/g, '\u2122')
    // Numeric hex entities: &#xNN;
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    // Numeric decimal entities: &#NNN;
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function stripInlineHtml(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts the Graph API's HTML preview of a Word document into structured
 * plain text, preserving headings, paragraphs, lists, and tables as markdown.
 */
function htmlToStructuredText(html: string): { text: string; sections: WordSection[] } {
  const sections: WordSection[] = [];
  let currentHeading = '';
  let currentLevel = 0;
  let currentContent: string[] = [];

  const flushSection = () => {
    if (currentHeading || currentContent.length > 0) {
      sections.push({
        heading: currentHeading,
        level: currentLevel,
        content: currentContent.join('\n').trim(),
      });
      currentContent = [];
    }
  };

  const processedHtml = html
    // Headings
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_match, level, content) => {
      flushSection();
      currentHeading = stripInlineHtml(content);
      currentLevel = parseInt(level);
      return '';
    })
    // Tables -> markdown
    .replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, tableContent) => {
      const rows: string[][] = [];
      const rowMatches = tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      for (const rowMatch of rowMatches) {
        const cells: string[] = [];
        const cellMatches = rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
        for (const cellMatch of cellMatches) {
          cells.push(stripInlineHtml(cellMatch[1]).trim());
        }
        rows.push(cells);
      }
      if (rows.length === 0) return '';
      const colWidths = rows[0].map((_, i) => Math.max(...rows.map((r) => (r[i] || '').length)));
      const formatted = rows
        .map((row, ri) => {
          const line =
            '| ' + row.map((cell, ci) => cell.padEnd(colWidths[ci] || 0)).join(' | ') + ' |';
          if (ri === 0) {
            const sep =
              '| ' + colWidths.map((w) => '-'.repeat(Math.max(w, 3))).join(' | ') + ' |';
            return line + '\n' + sep;
          }
          return line;
        })
        .join('\n');
      currentContent.push('\n' + formatted + '\n');
      return '';
    })
    // Lists
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_match, content) => {
      currentContent.push('\u2022 ' + stripInlineHtml(content).trim());
      return '';
    })
    // Paragraphs
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_match, content) => {
      const text = stripInlineHtml(content).trim();
      if (text) currentContent.push(text);
      return '';
    })
    .replace(/<br\s*\/?>/gi, '\n');

  const remaining = stripInlineHtml(processedHtml).trim();
  if (remaining) currentContent.push(remaining);

  flushSection();

  const fullText = sections
    .map((sec) => {
      const prefix = sec.heading ? '#'.repeat(sec.level) + ' ' + sec.heading + '\n\n' : '';
      return prefix + sec.content;
    })
    .join('\n\n')
    .trim();

  return { text: fullText, sections };
}

function truncate(text: string, label: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return (
    text.substring(0, CHARACTER_LIMIT) +
    `\n\n[Truncated at ${CHARACTER_LIMIT} chars. Document "${label}" has more content.]`
  );
}

// ─── Input validation ──────���───────────────────────────────────────────────────

/** Validate and sanitize itemId to prevent path traversal. */
function validateItemId(itemId: string): string {
  // Graph API item IDs are alphanumeric with hyphens, underscores, and sometimes ! or =
  if (!/^[A-Za-z0-9!_=-]+$/.test(itemId)) {
    throw new Error('Invalid itemId format');
  }
  return itemId;
}

/** Validate path to prevent traversal attacks. */
function validatePath(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error('Path must be absolute (start with /)');
  }
  if (path.includes('..')) {
    throw new Error('Path cannot contain ".." segments');
  }
  return path;
}

// ─── Helper to fetch a drive item by path or id ────────────────────────────────

interface DriveItemInfo {
  id: string;
  name: string;
  lastModifiedDateTime?: string;
  size?: number;
  folder?: unknown;
}

async function resolveDriveItem(
  graphClient: GraphClient,
  path?: string,
  itemId?: string
): Promise<DriveItemInfo> {
  const endpoint = itemId
    ? `/me/drive/items/${validateItemId(itemId)}`
    : `/me/drive/root:${validatePath(path!)}`;
  const result = (await graphClient.makeRequest(endpoint + '?$select=id,name,lastModifiedDateTime,size,folder')) as DriveItemInfo;
  return result;
}

async function fetchDocumentHtml(graphClient: GraphClient, itemId: string): Promise<string> {
  // Graph API converts Word docs to HTML via ?format=html
  const result = (await graphClient.makeRequest(
    `/me/drive/items/${itemId}/content?format=html`,
    { headers: { Accept: 'text/html' } }
  )) as { rawResponse?: string } | string;

  // makeRequest returns { rawResponse: html } for non-JSON responses
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object' && 'rawResponse' in result) {
    return result.rawResponse as string;
  }
  throw new Error('Failed to retrieve document HTML content');
}

// ─── Tool registration ─────────────────────────────────────────────────────────

export function registerWordTools(
  server: McpServer,
  graphClient: GraphClient,
  enabledToolsPattern?: string
): number {
  let enabledToolsRegex: RegExp | undefined;
  if (enabledToolsPattern) {
    try {
      enabledToolsRegex = new RegExp(enabledToolsPattern, 'i');
    } catch {
      // ignore invalid regex
    }
  }

  let count = 0;

  // ── read-word-document ───────────────────────────────────────────────────────

  if (!enabledToolsRegex || enabledToolsRegex.test('read-word-document')) {
    server.tool(
      'read-word-document',
      `Read the full text content of a Word (.docx) document from OneDrive.\nExtracts text, preserves heading structure, tables (as markdown), and lists.\n\nArgs:\n  - path: File path e.g. "/Documents/report.docx" \u2014 use this OR itemId\n  - itemId: OneDrive item ID \u2014 use this OR path\n\nReturns: Full document text with headings, tables, and lists preserved. Truncated at 50,000 chars for very large documents.`,
      {
        path: z.string().describe('File path e.g. /Documents/report.docx').optional(),
        itemId: z.string().describe('OneDrive item ID').optional(),
      },
      {
        title: 'read-word-document',
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
      async ({ path, itemId }) => {
        if (!path && !itemId) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Provide path or itemId' }) }],
            isError: true,
          };
        }
        try {
          const item = await resolveDriveItem(graphClient, path, itemId);

          if (item.folder) {
            return {
              content: [{ type: 'text', text: `"${item.name}" is a folder, not a document.` }],
            };
          }

          const name = item.name.toLowerCase();
          if (!name.endsWith('.docx') && !name.endsWith('.doc')) {
            return {
              content: [
                {
                  type: 'text',
                  text: `"${item.name}" doesn't appear to be a Word document. Use file download tools for plain text files.`,
                },
              ],
            };
          }

          const html = await fetchDocumentHtml(graphClient, item.id);
          const { text, sections } = htmlToStructuredText(html);

          const header = [
            `# ${item.name}`,
            item.lastModifiedDateTime
              ? `Last modified: ${new Date(item.lastModifiedDateTime).toLocaleString()}`
              : '',
            item.size ? `Size: ${(item.size / 1024).toFixed(1)} KB` : '',
            `Sections: ${sections.filter((s) => s.heading).length} headings found`,
            '---',
          ]
            .filter(Boolean)
            .join('\n');

          return { content: [{ type: 'text', text: truncate(`${header}\n\n${text}`, item.name) }] };
        } catch (error) {
          logger.error(`read-word-document error: ${(error as Error).message}`);
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to read document. Check the path or itemId and try again.' }) }],
            isError: true,
          };
        }
      }
    );
    count++;
  }

  // ── get-word-outline ─────────────────────────────────────────────────────────

  if (!enabledToolsRegex || enabledToolsRegex.test('get-word-outline')) {
    server.tool(
      'get-word-outline',
      `Get the heading structure (table of contents) of a Word document without reading the full content.\nUseful for understanding what's in a large document before reading specific sections.\n\nArgs:\n  - path: File path \u2014 use this OR itemId\n  - itemId: OneDrive item ID \u2014 use this OR path\n\nReturns: Hierarchical list of all headings with their levels (H1, H2, H3\u2026).`,
      {
        path: z.string().describe('File path').optional(),
        itemId: z.string().describe('OneDrive item ID').optional(),
      },
      {
        title: 'get-word-outline',
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
      async ({ path, itemId }) => {
        if (!path && !itemId) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Provide path or itemId' }) }],
            isError: true,
          };
        }
        try {
          const item = await resolveDriveItem(graphClient, path, itemId);
          const html = await fetchDocumentHtml(graphClient, item.id);
          const { sections } = htmlToStructuredText(html);
          const headings = sections.filter((s) => s.heading);

          if (headings.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `"${item.name}" has no headings \u2014 it may be unstructured text.`,
                },
              ],
            };
          }

          const outline = headings
            .map((s) => {
              const indent = '  '.repeat(Math.max(0, s.level - 1));
              return `${indent}${'#'.repeat(s.level)} ${s.heading}`;
            })
            .join('\n');

          return {
            content: [
              { type: 'text', text: `Document outline for "${item.name}":\n\n${outline}` },
            ],
          };
        } catch (error) {
          logger.error(`get-word-outline error: ${(error as Error).message}`);
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to get document outline. Check the path or itemId and try again.' }) }],
            isError: true,
          };
        }
      }
    );
    count++;
  }

  // ── search-word-document ─────────────────────────────────────────────────────

  if (!enabledToolsRegex || enabledToolsRegex.test('search-word-document')) {
    server.tool(
      'search-word-document',
      `Search for specific text within a Word document and return matching sections with context.\nMore efficient than reading the full document when you need specific information.\n\nArgs:\n  - path: File path \u2014 use this OR itemId\n  - itemId: OneDrive item ID \u2014 use this OR path\n  - query: Text to search for (case-insensitive)\n  - contextChars: Characters of context around each match (default: 300)\n\nReturns: All matching paragraphs/sections containing the search term (up to 20 matches).`,
      {
        path: z.string().describe('File path').optional(),
        itemId: z.string().describe('OneDrive item ID').optional(),
        query: z.string().min(1).describe('Text to search for'),
        contextChars: z
          .number()
          .int()
          .min(50)
          .max(1000)
          .default(300)
          .describe('Context window around matches')
          .optional(),
      },
      {
        title: 'search-word-document',
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
      async ({ path, itemId, query, contextChars }) => {
        if (!path && !itemId) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Provide path or itemId' }) }],
            isError: true,
          };
        }
        try {
          const ctxChars = contextChars ?? 300;
          const item = await resolveDriveItem(graphClient, path, itemId);
          const html = await fetchDocumentHtml(graphClient, item.id);
          const { text } = htmlToStructuredText(html);

          const lowerText = text.toLowerCase();
          const lowerQuery = query.toLowerCase();
          const matches: string[] = [];
          let searchFrom = 0;

          while (matches.length < 20) {
            const idx = lowerText.indexOf(lowerQuery, searchFrom);
            if (idx === -1) break;

            const start = Math.max(0, idx - ctxChars);
            const end = Math.min(text.length, idx + query.length + ctxChars);
            let snippet = text.substring(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < text.length) snippet = snippet + '...';

            matches.push(snippet);
            searchFrom = idx + query.length;
          }

          if (matches.length === 0) {
            return {
              content: [
                { type: 'text', text: `No matches found for "${query}" in "${item.name}".` },
              ],
            };
          }

          const result = [
            `Found ${matches.length} match(es) for "${query}" in "${item.name}":`,
            ...matches.map((m, i) => `--- Match ${i + 1} ---\n${m}`),
          ].join('\n\n');

          return { content: [{ type: 'text', text: result }] };
        } catch (error) {
          logger.error(`search-word-document error: ${(error as Error).message}`);
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to search document. Check the path or itemId and try again.' }) }],
            isError: true,
          };
        }
      }
    );
    count++;
  }

  logger.info(`Word tools: ${count} registered`);
  return count;
}
