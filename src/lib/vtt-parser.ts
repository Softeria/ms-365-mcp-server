/**
 * Parses WebVTT transcript content from Microsoft Teams into structured entries
 * and converts them to readable Markdown.
 */

export interface TranscriptEntry {
  startTime: string;
  endTime: string;
  speaker: string;
  text: string;
}

export function parseVtt(vttContent: string): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  const blocks = vttContent.split(/\n\n+/);

  for (const block of blocks) {
    const timeMatch = block.match(/(\d+:\d+:\d+[\d.]*)\s*-->\s*(\d+:\d+:\d+[\d.]*)/);
    const speakerMatch = block.match(/<v\s+([^>]+)>([^<]*)<\/v>/);
    if (timeMatch && speakerMatch) {
      entries.push({
        startTime: timeMatch[1],
        endTime: timeMatch[2],
        speaker: speakerMatch[1].trim(),
        text: speakerMatch[2].trim(),
      });
    }
  }
  return entries;
}

export function transcriptToMarkdown(entries: TranscriptEntry[]): string {
  if (entries.length === 0) {
    return '_No transcript entries found._';
  }

  const participants = [...new Set(entries.map((e) => e.speaker))];
  let md = `## Participants\n\n${participants.map((p) => `- ${p}`).join('\n')}\n\n`;
  md += `## Transcription\n\n`;

  let lastSpeaker = '';
  for (const entry of entries) {
    if (entry.speaker !== lastSpeaker) {
      md += `\n**${entry.speaker}** _(${entry.startTime})_\n\n`;
      lastSpeaker = entry.speaker;
    }
    md += `${entry.text} `;
  }
  return md.trim();
}
