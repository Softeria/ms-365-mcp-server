/**
 * read-mail-text: the full text of mail messages with the clutter removed.
 *
 * Graph already returns bodies as plain text when asked (Prefer:
 * outlook.body-content-type="text"), but that text is still mostly not the
 * message: every link is a Safe Links URL of several hundred characters,
 * marketing mail pads its preheader with thousands of invisible characters,
 * images become "[https://...png]" lines, and replies carry the whole quoted
 * thread. A 20-message inbox page is easily 300-400k characters, most of it
 * noise, which floods the agent context or overflows the tool-result limit.
 *
 * cleanMailText() removes that clutter deterministically, by pattern: quoted
 * reply history, the RFC 3676 signature, mobile sign-offs, a trailing footer
 * block (unsubscribe, legal notice, copyright), image placeholders and
 * link-only lines, and shortens every link to its real domain ("[link:
 * example.com]", Safe Links unwrapped). It never summarises or rewrites the
 * message's own text.
 */

export const MAIL_TEXT_MAX_IDS = 20;
export const MAIL_TEXT_MAX_TOP = 20;
export const MAIL_TEXT_DEFAULT_MAX_RESPONSE_CHARS = 80_000;
export const MAIL_TEXT_SELECT =
  'id,subject,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,body';
export const PREFER_TEXT_BODY = 'outlook.body-content-type="text"';

const QUOTE_START = [
  /^On .{1,300}wrote:\s*$/i, // Gmail / Apple Mail: "On <date>, <name> wrote:"
  /^-{2,}\s*Original Message\s*-{2,}/i, // Outlook classic
  /^_{10,}\s*$/, // Outlook separator above From:/Sent:
  /^Le .{1,300}a écrit\s*:\s*$/i,
  /^Am .{1,300}schrieb .{0,200}:\s*$/i,
];
const HEADER_FROM = /^\*?From:\*?\s+\S/i;
const HEADER_NEXT = /^\*?(Sent|Date|To|Subject):\*?\s/i;
const SIGNOFF_LINE =
  /^(Sent from my \w+|Get Outlook for (iOS|Android)|Sent from (Mail|Outlook) for \w+)\b.*$/i;
const FOOTER = new RegExp(
  [
    '\\bunsubscribe\\b',
    'view (this (e-?mail|message) )?(in|on) (your |a )?(web )?browser',
    'manage (your )?(e-?mail |subscription |communication )?preferences',
    'privacy (policy|notice|statement)',
    '\\bopt[ -]out\\b',
    "you('re| are) receiving (this|these|[\\w ]{0,40}(e-?mails?|messages|notifications))",
    'this (e-?mail|message)( and any (files|attachments)[^.]{0,40})? (is|are|may be|contains?) (strictly )?(confidential|privileged|intended)',
    'this (e-?mail|message) was (sent|intended) (to|for)\\b',
    'if you (are not|have received this)[^.]{0,60}(intended recipient|in error)',
    '©',
    '\\bcopyright\\s+(©\\s*)?\\d{4}',
    'all rights reserved',
  ].join('|'),
  'i'
);

function quoteStart(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (QUOTE_START.some((r) => r.test(l))) return i;
    // "On Tue, 7 Oct 2026 at 10:00, Paul Smith\n<paul@example.com> wrote:"
    if (
      /^On .{1,200}/i.test(l) &&
      i + 1 < lines.length &&
      /wrote:\s*$/i.test(lines[i + 1].trim()) &&
      l.length + lines[i + 1].length < 320
    ) {
      return i;
    }
    if (HEADER_FROM.test(l)) {
      let headers = 0;
      for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
        if (HEADER_NEXT.test(lines[j].trim())) headers++;
      }
      if (headers >= 2) return i;
    }
  }
  return -1;
}

function linkHost(u: string): string {
  try {
    let url = new URL(u);
    // Outlook / Defender Safe Links wrap the real target: show the real domain.
    const wrapped = url.searchParams.get('url');
    if (/(^|\.)safelinks\.protection\.outlook\.com$/i.test(url.hostname) && wrapped) {
      url = new URL(wrapped);
    }
    return url.hostname.replace(/^www\./, '') || 'link';
  } catch {
    return 'link';
  }
}

function shortenLinks(t: string): string {
  // Graph's text conversion writes anchors as "label<https://...>", images as
  // "[alt text]", linked images as "[alt]<https://...>"; bare URLs also occur.
  t = t.replace(/<((?:https?|mailto|tel):[^>\s]+)>/gi, (_m, u: string) =>
    /^(mailto|tel):/i.test(u) ? '' : ` [link: ${linkHost(u)}]`
  );
  t = t.replace(/\bhttps?:\/\/[^\s<>()"'[\]]+/gi, (u) => {
    const tail = u.match(/[.,;:!?]+$/);
    const bare = tail ? u.slice(0, -tail[0].length) : u;
    return `[link: ${linkHost(bare)}]${tail ? tail[0] : ''}`;
  });
  // "[<url>]": an image whose alt text is its URL.
  t = t.replace(/\[\s*(\[link: [^\]]*\])\s*\]/g, '$1');
  // "[alt]" not followed by a link: an image, no text.
  t = t.replace(/\[([^[\]\n]{1,80})\](?![ \t]*\[link:)/g, (m, alt: string) =>
    /^link: /.test(alt) ? m : ''
  );
  // "[alt] [link: x]": a linked image (button, logo); keep its label.
  t = t.replace(/\[([^[\]\n]{1,80})\]([ \t]*\[link:)/g, (m, alt: string, link: string) =>
    /^link: /.test(alt) ? m : alt + link
  );
  return t;
}

const isLinkOnly = (l: string): boolean =>
  l.replace(/\[link: [^\]]*\]/g, '').replace(/[\s|•·\-–]/g, '') === '';

export function cleanMailText(raw: string, opts: { keepQuoted?: boolean } = {}): string {
  const t = String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200b-\u200d\u2060\ufeff\u00ad]|\u034f/g, '') // zero-width / preheader padding
    .replace(/[\u00a0\u2007\u202f]/g, ' ');
  let lines = t.split('\n');

  if (!opts.keepQuoted) {
    const q = quoteStart(lines);
    if (q >= 0 && lines.slice(0, q).join('').trim()) lines = lines.slice(0, q);
    lines = lines.filter((l) => !/^\s*>/.test(l));
  }
  // Signature: the RFC 3676 delimiter "-- " (also a bare "--"), then mobile sign-offs.
  const sig = lines.findIndex((l) => l === '-- ' || l === '--');
  if (sig > 0 && lines.slice(0, sig).join('').trim()) lines = lines.slice(0, sig);
  lines = lines.filter((l) => !SIGNOFF_LINE.test(l.trim()));

  lines = shortenLinks(lines.join('\n'))
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim());
  // Lines that are nothing but links: nav bars, social icons, spacer images.
  lines = lines.filter((l) => l === '' || !isLinkOnly(l));

  // Footer: from the first footer-like line in the second half of the text to the
  // end, walking back over footer-like lines just above it (a block can straddle
  // the midpoint).
  const total = lines.reduce((n, l) => n + l.length + 1, 0);
  let seen = 0;
  for (let i = 0; i < lines.length; i++) {
    if (seen >= total / 2 && FOOTER.test(lines[i])) {
      let cut = i;
      for (let j = cut - 1; j >= Math.max(0, cut - 4); j--) {
        if (FOOTER.test(lines[j])) cut = j;
      }
      if (lines.slice(0, cut).join('').trim()) lines = lines.slice(0, cut);
      break;
    }
    seen += lines[i].length + 1;
  }
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface GraphRecipient {
  emailAddress?: { name?: string; address?: string };
}

export interface GraphMessage {
  id?: string;
  subject?: string;
  from?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  receivedDateTime?: string;
  hasAttachments?: boolean;
  body?: { contentType?: string; content?: string };
}

export interface MailTextEntry {
  id: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  received?: string;
  hasAttachments: boolean;
  text: string;
  chars: number;
  truncated: boolean;
}

function formatAddress(r?: GraphRecipient): string {
  const e = r?.emailAddress;
  if (!e) return '';
  return e.name && e.address && e.name !== e.address
    ? `${e.name} <${e.address}>`
    : e.address || e.name || '';
}

export function toMailTextEntry(m: GraphMessage, maxChars?: number): MailTextEntry {
  const subject = m.subject ?? '';
  // A forward's quoted part IS the content: keep it.
  const keepQuoted = /^\s*(fw|fwd)\s*:/i.test(subject);
  let text = cleanMailText(m.body?.content ?? '', { keepQuoted });
  const chars = text.length;
  let truncated = false;
  if (maxChars && chars > maxChars) {
    text = text.slice(0, maxChars);
    truncated = true;
  }
  return {
    id: m.id ?? '',
    from: formatAddress(m.from),
    to: (m.toRecipients ?? []).map(formatAddress),
    cc: (m.ccRecipients ?? []).map(formatAddress),
    subject,
    received: m.receivedDateTime,
    hasAttachments: !!m.hasAttachments,
    text,
    chars,
    truncated,
  };
}

/**
 * The whole result must fit the response limit; if it does not, nothing is
 * returned (no silent partial answer) and the error says how to narrow it.
 */
export function oversizeError(
  entries: Array<MailTextEntry | { id: string; error: string }>,
  size: number,
  limit: number
): string {
  const fmt = (n: number) => n.toLocaleString('en-US');
  const largest = entries
    .filter((e): e is MailTextEntry => 'text' in e)
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, 5)
    .map((e) => `"${(e.subject || '(no subject)').slice(0, 60)}" ${fmt(e.text.length)}`)
    .join(', ');
  return (
    `Response would be ${fmt(size)} characters (limit ${fmt(limit)}). Largest: ${largest}. ` +
    'Narrow the query (fewer messages via top, a filter such as a date range or sender, ' +
    'specific messageIds) or set maxChars to shorten each message.'
  );
}
