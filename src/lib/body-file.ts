/**
 * Helpers for using a local file's contents as an email message body.
 *
 * The mail tools (send-mail, create-draft-email and their shared-mailbox
 * variants) take a single `body` parameter holding the full Microsoft Graph
 * payload. The message text lives at a different place per endpoint
 * (`message.body.content` for /sendMail, `body.content` for a draft message),
 * so the target location is declared per-endpoint in endpoints.json via a
 * `bodyFile` config and applied here.
 *
 * These functions are pure (no I/O) so the file read and its error handling
 * stay in the tool handler, where they can be turned into an MCP error result.
 */

export type BodyFileContentType = 'html' | 'text';

export interface BodyFileConfig {
  /** Dot-path within the request body where the file contents are written. */
  contentTarget: string;
  /** Dot-path where the content type ('html'|'text') is written. Omit for plain-text-only targets (e.g. a reply `comment`). */
  contentTypeTarget?: string;
}

/**
 * Infer the Graph body content type from a file extension.
 * `.html`/`.htm` → 'html', everything else → 'text'.
 */
export function inferContentType(filePath: string): BodyFileContentType {
  return /\.html?$/i.test(filePath) ? 'html' : 'text';
}

/**
 * Find an existing own key on `node` that matches `key` case-insensitively,
 * returning the actual key if present. This lets the merge reuse whatever
 * casing the caller used (e.g. the Graph sendMail action wrapper is `Message`,
 * not `message`) instead of creating a second, conflicting key.
 */
function resolveKey(node: Record<string, unknown>, key: string): string {
  if (Object.prototype.hasOwnProperty.call(node, key)) return key;
  const lower = key.toLowerCase();
  for (const existing of Object.keys(node)) {
    if (existing.toLowerCase() === lower) return existing;
  }
  return key;
}

/**
 * Set a value at a dot-path within `target`, creating intermediate plain
 * objects as needed. Sibling keys are preserved, so caller-provided fields
 * (recipients, subject, ...) are never clobbered. Path segments match existing
 * keys case-insensitively, so writing `Message.body.content` lands inside a
 * caller-supplied `message`/`Message` object rather than adding a duplicate.
 */
export function setByPath(target: Record<string, unknown>, dotPath: string, value: unknown): void {
  const keys = dotPath.split('.');
  let node: Record<string, unknown> = target;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = resolveKey(node, keys[i]);
    const next = node[key];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) {
      node[key] = {};
    }
    node = node[key] as Record<string, unknown>;
  }
  const leaf = resolveKey(node, keys[keys.length - 1]);
  node[leaf] = value;
}

/**
 * Merge file contents into a copy of the caller-supplied request body at the
 * locations declared by `config`. The file content overrides any inline
 * content already present at `contentTarget`. Returns a new object; the input
 * is not mutated.
 */
export function applyBodyFile(
  requestBody: unknown,
  config: BodyFileConfig,
  fileContent: string,
  contentType: BodyFileContentType
): Record<string, unknown> {
  const base: Record<string, unknown> =
    typeof requestBody === 'object' && requestBody !== null && !Array.isArray(requestBody)
      ? structuredClone(requestBody as Record<string, unknown>)
      : {};

  setByPath(base, config.contentTarget, fileContent);
  if (config.contentTypeTarget) {
    setByPath(base, config.contentTypeTarget, contentType);
  }
  return base;
}
