import { describe, expect, it } from 'vitest';
import { parseVtt, transcriptToMarkdown } from '../src/lib/vtt-parser.js';

const SAMPLE_VTT = `WEBVTT

0:0:0.0 --> 0:0:8.840
<v Marc Bourget>Bonjour tout le monde, on commence le standup.</v>

0:0:8.840 --> 0:0:15.120
<v Clara Dupont>Oui, j'ai terminé le déploiement du WAF hier.</v>

0:0:15.120 --> 0:0:22.500
<v Marc Bourget>Parfait. Et pour le monitoring?</v>

0:0:22.500 --> 0:0:30.0
<v Clara Dupont>C'est en cours, je devrais finir aujourd'hui.</v>`;

describe('parseVtt', () => {
  it('should parse VTT content into structured entries', () => {
    const entries = parseVtt(SAMPLE_VTT);
    expect(entries).toHaveLength(4);
    expect(entries[0]).toEqual({
      startTime: '0:0:0.0',
      endTime: '0:0:8.840',
      speaker: 'Marc Bourget',
      text: 'Bonjour tout le monde, on commence le standup.',
    });
  });

  it('should handle accented characters in speaker names', () => {
    const vtt = `WEBVTT

0:0:0.0 --> 0:0:5.0
<v José García>Hola a todos.</v>`;
    const entries = parseVtt(vtt);
    expect(entries).toHaveLength(1);
    expect(entries[0].speaker).toBe('José García');
  });

  it('should return empty array for invalid VTT', () => {
    expect(parseVtt('')).toEqual([]);
    expect(parseVtt('not a vtt file')).toEqual([]);
  });

  it('should skip the WEBVTT header block', () => {
    const entries = parseVtt(SAMPLE_VTT);
    expect(entries.every((e) => e.speaker !== '')).toBe(true);
  });
});

describe('transcriptToMarkdown', () => {
  it('should produce Markdown with participants and transcription', () => {
    const entries = parseVtt(SAMPLE_VTT);
    const md = transcriptToMarkdown(entries);

    expect(md).toContain('## Participants');
    expect(md).toContain('- Marc Bourget');
    expect(md).toContain('- Clara Dupont');
    expect(md).toContain('## Transcription');
  });

  it('should consolidate consecutive entries from the same speaker', () => {
    const entries = parseVtt(SAMPLE_VTT);
    const md = transcriptToMarkdown(entries);

    // Marc Bourget speaks at 0:0:0.0 and 0:0:15.120 (not consecutive)
    // so his name should appear twice as a header
    const marcHeaders = md.match(/\*\*Marc Bourget\*\*/g);
    expect(marcHeaders).toHaveLength(2);

    // Clara Dupont speaks at 0:0:8.840 and 0:0:22.500 (not consecutive)
    const claraHeaders = md.match(/\*\*Clara Dupont\*\*/g);
    expect(claraHeaders).toHaveLength(2);
  });

  it('should consolidate truly consecutive same-speaker entries', () => {
    const vtt = `WEBVTT

0:0:0.0 --> 0:0:5.0
<v Alice>First sentence.</v>

0:0:5.0 --> 0:0:10.0
<v Alice>Second sentence.</v>

0:0:10.0 --> 0:0:15.0
<v Bob>My turn.</v>`;

    const entries = parseVtt(vtt);
    const md = transcriptToMarkdown(entries);

    // Alice should appear only once as header
    const aliceHeaders = md.match(/\*\*Alice\*\*/g);
    expect(aliceHeaders).toHaveLength(1);
    expect(md).toContain('First sentence. Second sentence.');
  });

  it('should return placeholder for empty entries', () => {
    const md = transcriptToMarkdown([]);
    expect(md).toContain('No transcript entries found');
  });
});
