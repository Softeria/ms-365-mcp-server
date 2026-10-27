import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderPresetsMarkdown } from '../bin/generate-presets-md.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const presetsMdPath = path.join(__dirname, '..', 'PRESETS.md');

describe('PRESETS.md', () => {
  it('is up to date with the live preset catalog (run npm run generate)', async () => {
    const onDisk = readFileSync(presetsMdPath, 'utf8');
    expect(onDisk).toBe(await renderPresetsMarkdown());
  });
});
