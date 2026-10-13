/**
 * read-mail-text: a triage view of mail messages, with the clutter removed.
 *
 * Graph already returns bodies as plain text when asked (Prefer:
 * outlook.body-content-type="text"), but that text is still mostly not the
 * message: every link is a Safe Links URL of several hundred characters,
 * marketing mail pads its preheader with thousands of invisible characters,
 * images become "[https://...png]" lines, and replies carry the whole quoted
 * thread. Between bodyPreview (255 characters) and the full body there is
 * nothing; a 20-message inbox page is easily 300-400k characters.
 *
 * cleanMailText() removes that clutter by pattern: quoted reply history, the
 * RFC 3676 signature, mobile sign-offs, a trailing footer block (unsubscribe,
 * legal notice, copyright) and image placeholders whose only content is a URL;
 * every link becomes a ⟦link: domain⟧ marker (Safe Links unwrapped). It never
 * summarises, but it is a lossy view: get-mail-message has the exact text.
 *
 * Mail bodies are attacker-controlled, so:
 *  - every pattern is bounded and the run delimiters are excluded from the runs,
 *    so cleaning is linear in the body size; the cleaner also reads at most
 *    MAIL_TEXT_MAX_INPUT_CHARS per message (beyond that the entry is truncated);
 *  - the marker brackets (U+27E6/U+27E7) are rewritten to [ ] in the input, so
 *    body text cannot produce a marker, and the marker shows the host the URL
 *    really points at (userinfo, parentheses and Safe Links included);
 *  - square-bracket text is kept ([JIRA-123], arr[i], [1]); lines that are
 *    only links collapse to one line of markers instead of disappearing.
 */

export const MAIL_TEXT_MAX_IDS = 20;
export const MAIL_TEXT_MAX_TOP = 20;
export const MAIL_TEXT_DEFAULT_MAX_RESPONSE_CHARS = 80_000;
export const MAIL_TEXT_MAX_INPUT_CHARS = 300_000;
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
  /^(Sent from my \w+|Get Outlook for (iOS|Android)|Sent from (Mail|Outlook) for \w+)\b.{0,200}$/i;
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
    if (l.length > 2000) continue; // header lines are short; skip giant lines cheaply
    if (QUOTE_START.some((r) => r.test(l))) return i;
    // "On Tue, 7 Oct 2026 at 10:00, Paul Smith\n<paul@example.com> wrote:"
    if (
      /^On .{1,200}/i.test(l) &&
      i + 1 < lines.length &&
      l.length + lines[i + 1].length < 320 &&
      /wrote:\s*$/i.test(lines[i + 1].trim())
    ) {
      return i;
    }
    if (HEADER_FROM.test(l)) {
      let headers = 0;
      for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
        if (lines[j].length < 2000 && HEADER_NEXT.test(lines[j].trim())) headers++;
      }
      if (headers >= 2) return i;
    }
  }
  return -1;
}

const MARK_RE = /\u27e6link: [^\u27e6\u27e7\n]{1,300}\u27e7/g;
const mark = (host: string): string => `\u27e6link: ${host}\u27e7`;

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

// A bare URL ends at whitespace, quotes, angle or square brackets; trailing
// sentence punctuation and unbalanced closing parentheses are not part of it.
function splitUrlTail(u: string): [string, string] {
  let opens = 0;
  let closes = 0;
  for (const c of u) {
    if (c === '(') opens++;
    else if (c === ')') closes++;
  }
  let end = u.length;
  while (end > 0) {
    const c = u[end - 1];
    if ('.,;:!?'.includes(c)) {
      end--;
    } else if (c === ')' && closes > opens) {
      end--;
      closes--;
    } else {
      break;
    }
  }
  return [u.slice(0, end), u.slice(end)];
}

function shortenLinks(t: string): string {
  // Graph's text conversion writes anchors as "label<https://...>", images as
  // "[alt]" and image sources as "[https://...]"; bare URLs also occur.
  t = t.replace(/<((?:https?|mailto|tel):[^<>\s]{1,4096})>/gi, (_m, u: string) =>
    /^(mailto|tel):/i.test(u) ? '' : ` ${mark(linkHost(u))}`
  );
  t = t.replace(/\bhttps?:\/\/[^\s<>"'[\]\u27e6\u27e7]{1,4096}/gi, (raw) => {
    const [u, tail] = splitUrlTail(raw);
    return mark(linkHost(u)) + tail;
  });
  // "[<image url>]": an image placeholder whose only content is its source.
  return t.replace(/\[[ \t]{0,20}\u27e6link: [^\u27e6\u27e7\n]{1,300}\u27e7[ \t]{0,20}\]/g, '');
}

export function cleanMailText(raw: string, opts: { keepQuoted?: boolean } = {}): string {
  const t = String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200b-\u200d\u2060\ufeff\u00ad]|\u034f/g, '') // zero-width / preheader padding
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/\u27e6/g, '[') // the marker brackets cannot come from the body
    .replace(/\u27e7/g, ']');
  let lines = t.split('\n');

  if (!opts.keepQuoted) {
    const q = quoteStart(lines);
    if (q >= 0 && lines.slice(0, q).join('').trim()) lines = lines.slice(0, q);
    lines = lines.filter((l) => !/^\s*>/.test(l));
    // Signature: the RFC 3676 delimiter "-- " (also a bare "--"). Not when the
    // quoted part is kept: a forward sits below the sender's signature.
    const sig = lines.findIndex((l) => l === '-- ' || l === '--');
    if (sig > 0 && lines.slice(0, sig).join('').trim()) lines = lines.slice(0, sig);
  }
  lines = lines.filter((l) => l.length > 300 || !SIGNOFF_LINE.test(l.trim()));

  lines = shortenLinks(lines.join('\n'))
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim());

  // Runs of lines that are nothing but links (nav bars, social icons) collapse
  // to one line of their distinct markers: the links stay, the clutter goes.
  const collapsed: Array<string | string[]> = [];
  let run: string[] | null = null;
  for (const l of lines) {
    const marks = l.match(MARK_RE);
    const linkOnly = !!marks && l.replace(MARK_RE, '').replace(/[\s|•·\-–]/g, '') === '';
    if (linkOnly) {
      if (!run) {
        run = [];
        collapsed.push(run);
      }
      for (const m of marks) if (!run.includes(m)) run.push(m);
    } else {
      run = null;
      collapsed.push(l);
    }
  }
  lines = collapsed.map((x) => (Array.isArray(x) ? x.join(' ') : x));

  // Footer: from the first footer-like line in the second half of the text to the
  // end, walking back over footer-like lines just above it (a block can straddle
  // the midpoint). Only reasonably short lines are tested.
  const isFooter = (l: string): boolean => l.length <= 2000 && FOOTER.test(l);
  const total = lines.reduce((n, l) => n + l.length + 1, 0);
  let seen = 0;
  for (let i = 0; i < lines.length; i++) {
    if (seen >= total / 2 && isFooter(lines[i])) {
      let cut = i;
      for (let j = cut - 1; j >= Math.max(0, cut - 4); j--) {
        if (isFooter(lines[j])) cut = j;
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

export interface MailTextArgs {
  messageIds?: string[];
  folderId?: string;
  top?: number;
  filter?: string;
  search?: string;
  maxChars?: number;
}

/**
 * Validates arguments in execute() itself: in discovery mode execute-tool
 * passes raw parameters, so the zod schema never runs. Returns an error
 * message, or undefined when the arguments are usable.
 */
export function validateMailTextArgs(p: Record<string, unknown>): string | undefined {
  const isInt = (v: unknown, min: number, max = Number.MAX_SAFE_INTEGER): boolean =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
  const hasIds = p.messageIds !== undefined;
  const hasFolder = p.folderId !== undefined;
  if (hasIds === hasFolder) return 'Give messageIds or folderId (exactly one).';
  if (p.maxChars !== undefined && !isInt(p.maxChars, 1)) {
    return 'maxChars must be a positive integer.';
  }
  if (hasIds) {
    const ids = p.messageIds;
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.some((x) => typeof x !== 'string' || !x.trim())
    ) {
      return 'messageIds must be a non-empty list of message ids.';
    }
    if (ids.length > MAIL_TEXT_MAX_IDS) return `At most ${MAIL_TEXT_MAX_IDS} messageIds per call.`;
    if (p.top !== undefined || p.filter !== undefined || p.search !== undefined) {
      return 'top, filter and search apply only with folderId.';
    }
    return undefined;
  }
  if (typeof p.folderId !== 'string' || !p.folderId.trim()) {
    return 'folderId must be a non-empty string.';
  }
  if (p.top !== undefined && !isInt(p.top, 1, MAIL_TEXT_MAX_TOP)) {
    return `top must be an integer from 1 to ${MAIL_TEXT_MAX_TOP}.`;
  }
  for (const k of ['filter', 'search']) {
    const v = p[k];
    if (v !== undefined && (typeof v !== 'string' || !v.trim())) {
      return `${k} must be a non-empty string (omit it to read the newest messages).`;
    }
  }
  if (p.filter !== undefined && p.search !== undefined) {
    return 'Microsoft Graph cannot combine filter and search on messages; use one.';
  }
  return undefined;
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
  let raw = m.body?.content ?? '';
  let truncated = false;
  if (raw.length > MAIL_TEXT_MAX_INPUT_CHARS) {
    raw = raw.slice(0, MAIL_TEXT_MAX_INPUT_CHARS);
    truncated = true;
  }
  let text = cleanMailText(raw, { keepQuoted });
  const chars = text.length;
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
