import logger from '../logger.js';

/**
 * officeparser is an optional dependency (see package.json) so that installs which never
 * touch convert-document don't pay for tesseract.js / pdfjs-dist. Importing it eagerly at
 * module load would crash the whole server for anyone who skipped it (e.g. `npm install
 * --omit=optional`), so every caller goes through this lazy, cached loader instead.
 */
let officeParserModulePromise: Promise<typeof import('officeparser')> | undefined;

function loadOfficeParser(): Promise<typeof import('officeparser')> {
  officeParserModulePromise ??= import('officeparser');
  return officeParserModulePromise;
}

/** Thrown when the optional `officeparser` package is not installed. */
export class OfficeParserNotInstalledError extends Error {
  constructor() {
    super(
      "convert-document requires the optional 'officeparser' package, which is not installed. " +
        'Run `npm install officeparser` alongside this server (it is an optionalDependency, so a ' +
        'plain `npm install` normally already includes it — this only happens after ' +
        '`npm install --omit=optional` or an install that pruned it).'
    );
    this.name = 'OfficeParserNotInstalledError';
  }
}

export interface ConvertBufferOptions {
  /** Run OCR on embedded images. Off by default: slower, and unnecessary for born-digital
   *  documents, which covers the large majority of email/drive attachments. */
  ocr?: boolean;
  /** Hard ceiling on parse time, covering both normal parsing and OCR. Guards against a
   *  pathological or adversarial file hanging the process. */
  timeoutMs?: number;
  /** Markdown output is cut to this many characters; `truncated` reports whether that
   *  happened, and `totalLength` is the untruncated length, so a caller can decide whether
   *  to ask for a narrower conversion instead of assuming everything came through. */
  maxOutputChars?: number;
}

export interface ConvertBufferResult {
  markdown: string;
  truncated: boolean;
  totalLength: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_CHARS = 20_000;

/**
 * Convert a binary document (PDF, DOCX, PPTX, XLSX, ODT, ...) already held in memory into
 * markdown. Never touches the filesystem and never accepts a path — callers must already
 * have the bytes (e.g. from a Graph fetch), keeping this usable from an HTTP-mode server
 * without adding disk-based attack surface.
 */
export async function convertBufferToMarkdown(
  buffer: Buffer,
  options: ConvertBufferOptions = {}
): Promise<ConvertBufferResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputChars = options.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;

  let parseOffice: typeof import('officeparser').parseOffice;
  try {
    ({ parseOffice } = await loadOfficeParser());
  } catch (error) {
    logger.warn(`officeparser import failed: ${(error as Error).message}`);
    throw new OfficeParserNotInstalledError();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const ast = await parseOffice(buffer, {
      ocr: options.ocr ?? false,
      abortSignal: controller.signal,
    });
    const { value: markdown } = await ast.to('md');
    const totalLength = markdown.length;
    const truncated = totalLength > maxOutputChars;
    return {
      markdown: truncated ? markdown.slice(0, maxOutputChars) : markdown,
      truncated,
      totalLength,
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(
        `Document conversion exceeded the ${timeoutMs}ms limit and was cancelled. Try again ` +
          'with ocr disabled, or use download-bytes / download-bytes-to-file instead.'
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
