/**
 * read-mail-text: mail messages as text with the bulk junk removed.
 *
 * Graph already returns bodies as plain text when asked (Prefer:
 * outlook.body-content-type="text"), but that text is still mostly not the
 * message: every link is a Safe Links URL of several hundred characters,
 * marketing mail pads its preheader with thousands of invisible characters,
 * images become "[https://...png]" lines, and replies carry the whole quoted
 * thread. Between bodyPreview (255 characters) and the full body there is
 * nothing; a 20-message inbox page is easily 300-400k characters.
 *
 * The rule is: remove obvious junk, never cut or rewrite the message itself;
 * anything ambiguous is kept. cleanMailText() removes runs of invisible padding
 * characters, image placeholders (a bracketed address of an image file), and
 * quoted reply history from its header down (forwards keep theirs). Links are kept: links wrapped by mail security or webmail
 * (Safe Links, Proofpoint URL Defense, Google's redirect) are unwrapped to the
 * real address and tracking parameters (utm_* and the like) are dropped; only
 * an address still longer than 300 characters, a tracking redirect, becomes a
 * ⟦link: domain⟧ marker naming the real host. Signatures, footers and
 * everything else in the message are left as they are.
 *
 * Mail bodies are attacker-controlled, so every pattern is bounded and excludes
 * its own delimiters (cleaning is linear in the body size), at most
 * MAIL_TEXT_MAX_INPUT_CHARS per message are cleaned (beyond that the entry is
 * truncated), and the marker brackets (U+27E6/U+27E7) are rewritten to [ ] in
 * the input so body text cannot produce a marker.
 */

export const MAIL_TEXT_MAX_IDS = 20;
export const MAIL_TEXT_MAX_TOP = 20;
export const MAIL_TEXT_DEFAULT_MAX_RESPONSE_CHARS = 80_000;
export const MAIL_TEXT_MAX_INPUT_CHARS = 300_000;
export const MAIL_TEXT_SELECT =
  'id,subject,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,body';
export const PREFER_TEXT_BODY = 'outlook.body-content-type="text"';

// Reply headers. The "On <date>, <name> wrote:" forms must contain a digit (the
// date), so text that merely mentions the phrase is not taken for one.
const QUOTE_START = [
  /^On .{1,300}wrote:\s*$/i, // Gmail / Apple Mail
  /^-{2,}\s*Original Message\s*-{2,}/i, // Outlook classic
  /^Le .{1,300}a écrit\s*:\s*$/i,
  /^Am .{1,300}schrieb .{0,200}:\s*$/i,
];
const DATED = [true, false, true, true];
function isReplyHeader(l: string): boolean {
  return QUOTE_START.some((r, k) => r.test(l) && (!DATED[k] || /\d/.test(l)));
}
const HEADER_FROM = /^\*?From:\*?\s+\S/i;
const HEADER_NEXT = /^\*?(Sent|Date|To|Subject):\*?\s/i;
const SEPARATOR = /^_{10,}\s*$/; // Outlook's line above a From:/Sent: block

// "From: ..." followed by at least two of Sent/Date/To/Subject: a quoted
// message's header block.
function isHeaderBlock(lines: string[], i: number): boolean {
  const l = lines[i]?.trim() ?? '';
  if (l.length > 2000 || !HEADER_FROM.test(l)) return false;
  let headers = 0;
  for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
    if (lines[j].length < 2000 && HEADER_NEXT.test(lines[j].trim())) headers++;
  }
  return headers >= 2;
}
function quoteStart(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.length > 2000) continue; // header lines are short; skip giant lines cheaply
    if (isReplyHeader(l)) return i;
    // Apple Mail quotes the whole history with ">", header included.
    if (l.startsWith('>') && isReplyHeader(l.replace(/^(?:>[ \t]?){1,20}/, '').trim())) return i;
    // "On Tue, 7 Oct 2026 at 10:00, Paul Smith\n<paul@example.com> wrote:"
    if (
      /^On .{1,200}/i.test(l) &&
      /\d/.test(l) &&
      i + 1 < lines.length &&
      l.length + lines[i + 1].length < 320 &&
      /wrote:\s*$/i.test(lines[i + 1].trim())
    ) {
      return i;
    }
    if (isHeaderBlock(lines, i)) return i;
    // The separator counts only above a header block: ticket systems and
    // receipts use the same line between parts of the message itself.
    if (SEPARATOR.test(l)) {
      let j = i + 1;
      while (j < lines.length && j <= i + 2 && !lines[j].trim()) j++;
      if (isHeaderBlock(lines, j)) return i;
    }
  }
  return -1;
}

const MARK_OPEN = '\u27e6';
const mark = (host: string): string => `\u27e6link: ${host}\u27e7`;
// Longer addresses (after unwrapping and tracking parameters are removed) are
// shortened to their domain. Nearly all are tracking redirects; the exact address
// of any link is in get-mail-message.
const MAX_KEPT_URL = 300;

// Query parameters that only identify the recipient or campaign to a tracker:
// ones defined by analytics and ad platforms, valid on any site, and LinkedIn's
// own, only on LinkedIn links.
const TRACKING_PARAM =
  /^(utm_[a-z_]+|mc_cid|mc_eid|_hsenc|_hsmi|__hstc|__hssc|__hsfp|mkt_tok|gclid|dclid|fbclid|msclkid|yclid|igshid)$/i;
const LINKEDIN_TRACKING_PARAM = /^(trackingid|refid|lipi|midtoken|midsig|trk|trkemail)$/i;

// Proofpoint URL Defense v3: the real address sits between "__" markers, with
// some characters replaced by "*" (one) or "**<c>" (a run) and listed, base64
// encoded, after the ";".
const RUN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function unwrapUrlDefenseV3(u: string): string | undefined {
  const m = /^https:\/\/urldefense\.com\/v3\/__(.{1,4096}?)__;([A-Za-z0-9_-]{0,4096})!/.exec(u);
  if (!m) return undefined;
  const replaced = [...Buffer.from(m[2], 'base64url').toString('utf8')];
  let next = 0;
  let out = m[1].replace(/\*\*(.)|\*/g, (tok, run?: string) => {
    const n = run === undefined ? 1 : RUN_CHARS.indexOf(run) + 2;
    if (n < 1) return tok;
    const s = replaced.slice(next, next + n).join('');
    next += n;
    return s;
  });
  out = out.replace(/^(https?:)\/(?!\/)/i, '$1//');
  return new URL(out).href;
}

// One wrapper removed, or undefined when the link is not wrapped.
function unwrapOnce(u: string): string | undefined {
  const url = new URL(u);
  const host = url.hostname.toLowerCase();
  if (/(^|\.)safelinks\.protection\.outlook\.com$/.test(host)) {
    const w = url.searchParams.get('url');
    return w ? new URL(w).href : undefined;
  }
  if (host === 'urldefense.com') return unwrapUrlDefenseV3(u);
  if (host === 'urldefense.proofpoint.com') {
    // v2: "-" stands for "%" and "_" for "/" in the encoded address.
    const w = url.searchParams.get('u');
    return w
      ? new URL(decodeURIComponent(w.replace(/_/g, '/').replace(/-/g, '%'))).href
      : undefined;
  }
  if (/^(www\.)?google\.[a-z.]{2,6}$/.test(host) && url.pathname === '/url') {
    const w = url.searchParams.get('q') ?? url.searchParams.get('url');
    return w && /^https?:\/\//i.test(w) ? new URL(w).href : undefined;
  }
  return undefined;
}

// The real address behind a link. Mail security and webmail wrap links in their
// own redirect (Outlook / Defender Safe Links, Proofpoint URL Defense, Google's
// /url redirect), sometimes one inside another. Tracking parameters are then
// dropped.
function unwrapLink(u: string): string {
  let real = u;
  for (let i = 0; i < 3; i++) {
    let next: string | undefined;
    try {
      next = unwrapOnce(real);
    } catch {
      next = undefined;
    }
    if (!next || next === real) break;
    real = next;
  }
  try {
    const r = new URL(real);
    const linkedIn = /(^|\.)linkedin\.com$/i.test(r.hostname);
    let dropped = false;
    for (const k of [...r.searchParams.keys()]) {
      if (TRACKING_PARAM.test(k) || (linkedIn && LINKEDIN_TRACKING_PARAM.test(k))) {
        r.searchParams.delete(k);
        dropped = true;
      }
    }
    return dropped ? r.href : real;
  } catch {
    return real;
  }
}

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '') || 'link';
  } catch {
    return 'link';
  }
}

// A link as shown: the real address in full when short, otherwise a marker
// naming the real host (userinfo and parentheses included in the parse).
function showLink(u: string): string {
  const real = unwrapLink(u);
  return real.length <= MAX_KEPT_URL ? real : mark(hostOf(real));
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

function isImageUrl(u: string): boolean {
  try {
    return /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(new URL(u).pathname);
  } catch {
    return false;
  }
}

function cleanLinks(t: string): string {
  // "[<image url>]": Graph's text for an image is its address in brackets. Only an
  // address that names an image file is removed; other bracketed links stay.
  t = t.replace(
    /\[[ \t]{0,20}(https?:\/\/[^\s<>"'[\]\u27e6\u27e7]{1,4096})[ \t]{0,20}\]/gi,
    (m, u: string) => (isImageUrl(u) ? '' : m)
  );
  // Graph's text conversion writes anchors as "label<https://...>"; bare URLs also
  // occur. Bounded quantifiers with the delimiters excluded keep this linear.
  t = t.replace(/<((?:https?|mailto|tel):[^<>\s]{1,4096})>/gi, (m, u: string) => {
    if (/^(mailto|tel):/i.test(u)) return m;
    const shown = showLink(u);
    return shown.startsWith(MARK_OPEN) ? ` ${shown}` : ` <${shown}>`;
  });
  return t.replace(
    /(^|[^<])\b(https?:\/\/[^\s<>"'[\]\u27e6\u27e7]{1,4096})/gi,
    (_m, pre: string, raw: string) => {
      const [u, tail] = splitUrlTail(raw);
      return pre + showLink(u) + tail;
    }
  );
}

const LINK_TOKEN = /<?https?:\/\/[^\s<>]{1,4096}>?|\u27e6link: [^\u27e6\u27e7\n]{1,300}\u27e7/g;

export function cleanMailText(raw: string, opts: { keepQuoted?: boolean } = {}): string {
  const t = String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    // Preheader padding: runs of invisible characters (a single one, such as a
    // soft hyphen in a word, is part of the text and stays).
    .replace(/(?:(?:[\u200b-\u200d\u2060\ufeff\u00ad]|\u034f)[ \t\u00a0\u2007\u202f]*){3,}/g, ' ')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/\u27e6/g, '[') // the marker brackets cannot come from the body
    .replace(/\u27e7/g, ']');
  let lines = t.split('\n');

  if (!opts.keepQuoted) {
    const q = quoteStart(lines);
    if (q >= 0 && lines.slice(0, q).join('').trim()) lines = lines.slice(0, q);
  }

  lines = cleanLinks(lines.join('\n'))
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim());

  // Runs of lines that are nothing but links (nav bars, social icons) collapse
  // to one line of their distinct links: every link stays, the clutter goes.
  const collapsed: Array<string | string[]> = [];
  let run: string[] | null = null;
  const seen = new Set<string>();
  for (const l of lines) {
    const links = l.match(LINK_TOKEN);
    const linkOnly = !!links && l.replace(LINK_TOKEN, '').replace(/[\s|•·\-–]/g, '') === '';
    if (linkOnly) {
      if (!run) {
        run = [];
        collapsed.push(run);
        seen.clear();
      }
      for (const k of links) {
        if (!seen.has(k)) {
          seen.add(k);
          run.push(k);
        }
      }
    } else {
      run = null;
      collapsed.push(l);
    }
  }
  return collapsed
    .map((x) => (Array.isArray(x) ? x.join(' ') : x))
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
