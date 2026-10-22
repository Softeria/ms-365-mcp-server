import { readFileSync } from 'node:fs';

/**
 * Parse an enabled-tools filter file into the same string `--enabled-tools`
 * would take: whole-line `#` comments and blank lines dropped, then joined
 * with `|`.
 */
export function parseEnabledToolsFileContent(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => !line.startsWith('#'))
    .filter((line) => line.length > 0)
    .join('|');
}

/**
 * Read a filter file and return a regex pattern string for `enabledTools`.
 * Throws if the file is missing or unreadable.
 */
export function readEnabledToolsFromFile(filePath: string): string {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(
      `could not read enabled tools file ${JSON.stringify(filePath)}: ${(error as Error).message}`
    );
  }
  return parseEnabledToolsFileContent(content);
}
