/**
 * Drive file text extraction (PDF, DOCX, plain text) and optional external service.
 * If TEXT_EXTRACTION_URL is set, external extraction runs first; on failure, built-ins are used.
 * Used by the `download-drive-file-text` MCP tool and by `downloadDriveFileAndExtractText`.
 *
 * External modes (TEXT_EXTRACTION_FORMAT): `json` (default) POSTs { fileBase64, mimeType, fileName };
 * `multipart` POSTs multipart/form-data with field TEXT_EXTRACTION_MULTIPART_FIELD (default `file`).
 */
import logger from '../logger.js';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
export const DEFAULT_MAX_CHARS = 500_000;

/** `json` (default): POST `{ fileBase64, mimeType, fileName }`. `multipart`: POST `multipart/form-data` with one file field (FastAPI/OpenAPI-style uploads). */
export type ExternalExtractionFormat = 'json' | 'multipart';

export interface ExternalExtractionConfig {
  url: string;
  apiKey?: string;
  format: ExternalExtractionFormat;
  /** Form field name for multipart mode (default `file`). */
  multipartFieldName: string;
}

export function getExternalExtractionConfigFromEnv(): ExternalExtractionConfig | null {
  const url = process.env.TEXT_EXTRACTION_URL?.trim();
  if (!url) return null;
  const apiKey = process.env.TEXT_EXTRACTION_API_KEY?.trim();

  const rawFormat = process.env.TEXT_EXTRACTION_FORMAT?.trim().toLowerCase();
  let format: ExternalExtractionFormat = 'json';
  if (rawFormat === 'multipart') {
    format = 'multipart';
  } else if (rawFormat && rawFormat !== 'json') {
    logger.warn(
      `Ignoring invalid TEXT_EXTRACTION_FORMAT=${JSON.stringify(process.env.TEXT_EXTRACTION_FORMAT)} (use json or multipart)`
    );
  }

  const multipartFieldName = process.env.TEXT_EXTRACTION_MULTIPART_FIELD?.trim() || 'file';

  return { url, apiKey: apiKey || undefined, format, multipartFieldName };
}

export function truncateText(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, maxChars), truncated: true };
}

function detectKind(
  mimeType: string | undefined,
  fileName: string | undefined
): 'pdf' | 'docx' | 'text' | 'unknown' {
  const m = (mimeType || '').toLowerCase();
  const n = (fileName || '').toLowerCase();
  if (m.includes('pdf') || n.endsWith('.pdf')) return 'pdf';
  if (m.includes('wordprocessingml') || n.endsWith('.docx')) {
    return 'docx';
  }
  if (
    m.startsWith('text/') ||
    m === 'application/json' ||
    m === 'application/xml' ||
    n.endsWith('.txt') ||
    n.endsWith('.md') ||
    n.endsWith('.csv') ||
    n.endsWith('.json')
  ) {
    return 'text';
  }
  return 'unknown';
}

export async function extractTextBuiltin(
  buffer: Uint8Array,
  mimeType: string | undefined,
  fileName: string | undefined
): Promise<{ text: string; extractor: string }> {
  const kind = detectKind(mimeType, fileName);

  if (kind === 'text') {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    return { text, extractor: 'builtin-text' };
  }

  if (kind === 'pdf') {
    const parser = new PDFParse({ data: Buffer.from(buffer) });
    try {
      const textResult = await parser.getText();
      return { text: textResult.text || '', extractor: 'builtin-pdf' };
    } finally {
      await parser.destroy();
    }
  }

  if (kind === 'docx') {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return { text: result.value || '', extractor: 'builtin-docx' };
  }

  throw new Error(
    `No built-in extractor for this type (mime=${mimeType ?? 'unknown'}, name=${fileName ?? 'unknown'}). ` +
      `Supported built-ins: PDF, DOCX, plain text and text-like types. ` +
      `Set TEXT_EXTRACTION_URL for a custom extractor, or convert the file first.`
  );
}

export async function extractTextExternal(
  buffer: Uint8Array,
  mimeType: string | undefined,
  fileName: string | undefined,
  config: ExternalExtractionConfig
): Promise<{ text: string; extractor: string }> {
  const headers: Record<string, string> = {};
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  let res: Response;
  if (config.format === 'multipart') {
    const formData = new FormData();
    const blob = new Blob([Buffer.from(buffer)], {
      type: mimeType ?? 'application/octet-stream',
    });
    formData.append(config.multipartFieldName, blob, fileName ?? 'file');
    res = await fetch(config.url, {
      method: 'POST',
      headers,
      body: formData,
    });
  } else {
    const fileBase64 = Buffer.from(buffer).toString('base64');
    headers['Content-Type'] = 'application/json';
    res = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fileBase64,
        mimeType: mimeType ?? 'application/octet-stream',
        fileName: fileName ?? 'file',
      }),
    });
  }

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `External text extraction failed: ${res.status} ${res.statusText} — ${errBody.slice(0, 500)}`
    );
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new Error('External text extraction returned non-JSON body');
  }

  const text = extractTextFromExternalPayload(payload);
  if (typeof text !== 'string') {
    throw new Error('External extractor response did not include a text field');
  }

  return { text, extractor: 'external' };
}

function extractTextFromExternalPayload(payload: unknown): string | undefined {
  if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>;
    if (typeof o.text === 'string') return o.text;
    if (typeof o.extractedText === 'string') return o.extractedText;
    if (typeof o.extracted_text === 'string') return o.extracted_text;
    if (typeof o.page_content === 'string') return o.page_content;
    if (o.result && typeof o.result === 'object') {
      const r = o.result as Record<string, unknown>;
      if (typeof r.text === 'string') return r.text;
      if (typeof r.extracted_text === 'string') return r.extracted_text;
    }
  }
  if (typeof payload === 'string') return payload;
  return undefined;
}

export interface ExtractOptions {
  buffer: Uint8Array;
  mimeType: string | undefined;
  fileName: string | undefined;
  maxBytes: number;
  maxChars: number;
}

export async function extractDriveFileText(opts: ExtractOptions): Promise<{
  text: string;
  truncated: boolean;
  extractor: string;
  sizeBytes: number;
  mimeType: string | undefined;
  fileName: string | undefined;
}> {
  const { buffer, mimeType, fileName, maxBytes, maxChars } = opts;

  if (buffer.length > maxBytes) {
    throw new Error(
      `File size ${buffer.length} bytes exceeds maxBytes (${maxBytes}). Increase maxBytes or use a smaller file.`
    );
  }

  const external = getExternalExtractionConfigFromEnv();

  if (external) {
    try {
      const { text, extractor } = await extractTextExternal(buffer, mimeType, fileName, external);
      const { text: out, truncated } = truncateText(text, maxChars);
      return {
        text: out,
        truncated,
        extractor,
        sizeBytes: buffer.length,
        mimeType,
        fileName,
      };
    } catch (err) {
      logger.warn(
        `External extraction failed, falling back to built-in: ${(err as Error).message}`
      );
    }
  }

  const { text, extractor } = await extractTextBuiltin(buffer, mimeType, fileName);
  const { text: out, truncated } = truncateText(text, maxChars);
  return {
    text: out,
    truncated,
    extractor,
    sizeBytes: buffer.length,
    mimeType,
    fileName,
  };
}
