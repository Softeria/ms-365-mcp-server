/**
 * Helpers for `Tool.shape`: condense Graph objects to what an agent needs to
 * understand a result and make its next call — ids on every item, the main
 * human-readable summary, nothing else. Callers who need more pass `select` or
 * `response_format: 'detailed'`.
 */

type Raw = Record<string, unknown>;

/** Apply `item` to each element of a Graph collection, keeping the paging link. */
export function listShape(item: (raw: Raw) => unknown) {
  return (raw: unknown) => {
    const r = (raw ?? {}) as { value?: unknown[]; '@odata.nextLink'?: string };
    return {
      value: (r.value ?? []).map((v) => item((v ?? {}) as Raw)),
      ...(r['@odata.nextLink'] ? { '@odata.nextLink': r['@odata.nextLink'] } : {}),
    };
  };
}

/**
 * Drop Graph bookkeeping (`@odata.*`, `changeKey`) and empty values (null,
 * '', [], {}) recursively. `false` and `0` are kept.
 */
export function compact(value: unknown): unknown {
  if (Array.isArray(value)) {
    const out = value.map(compact).filter((v) => v !== undefined);
    return out.length > 0 ? out : undefined;
  }
  if (value !== null && typeof value === 'object') {
    const out: Raw = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('@odata') || k === 'changeKey') continue;
      const c = compact(v);
      if (c !== undefined) out[k] = c;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return value === null || value === '' ? undefined : value;
}

interface GraphEmailAddress {
  emailAddress?: { name?: string; address?: string };
}

/** `{ emailAddress: { name, address } }` → `"Name <address>"` (or the bare address). */
export function person(r: GraphEmailAddress | undefined): string | undefined {
  const address = r?.emailAddress?.address;
  const name = r?.emailAddress?.name;
  if (!address) return name;
  return name && name !== address ? `${name} <${address}>` : address;
}

/** Recipient list → bare SMTP addresses. */
export function addresses(list: GraphEmailAddress[] | undefined): string[] {
  return (list ?? []).map((r) => r.emailAddress?.address).filter((a): a is string => !!a);
}

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

/** Teams/HTML message body → readable plain text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/div|\/li|\/tr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/g, (m) => ENTITIES[m] ?? m)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Cap `text` at `max` chars, flagging the cut so the agent knows to fetch the full item. */
export function capText(text: string | undefined, max: number) {
  if (text === undefined || text.length <= max) return { text };
  return { text: `${text.slice(0, max)}…`, truncated: true };
}

/** Absolute Graph URL → the relative path tools like download-bytes take. */
export function graphPath(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).pathname.replace(/^\/(v1\.0|beta)/, '');
  } catch {
    return undefined;
  }
}

/** driveItem (OneDrive or SharePoint) → id, name, folder/file kind, size, link. */
export function driveItemSummary(raw: Raw) {
  const d = raw as {
    id?: string;
    name?: string;
    size?: number;
    webUrl?: string;
    lastModifiedDateTime?: string;
    folder?: { childCount?: number };
    file?: { mimeType?: string };
  };
  return compact({
    id: d.id,
    name: d.name,
    ...(d.folder ? { isFolder: true, childCount: d.folder.childCount } : {}),
    mimeType: d.file?.mimeType,
    size: d.size,
    webUrl: d.webUrl,
    lastModifiedDateTime: d.lastModifiedDateTime,
  });
}
