import { describe, it, expect } from 'vitest';
import {
  canonicalString,
  digest,
  quoteAll,
  unquotePlus,
  parseQsl,
  compareByCodePoint,
  signUrl,
} from '../src/lib/url-signing.js';

/**
 * These vectors are not hand-written. Each was produced by this module and then
 * checked, byte for byte, against docglean-mcp's `signing.py` -- `canonical_string`
 * for the string and `_digest` for the signature -- by running both over the same
 * URL and comparing. They are pinned here so the cross-language agreement survives
 * without Python in CI: a refactor that changes any of them has changed the wire
 * format, and every signature this server mints stops verifying.
 *
 * Regenerate by re-running the differential, never by pasting in what this code
 * now happens to produce.
 */
const KEY = 'shared-secret-é';
const EXPIRY = '1780000000';

const VECTORS: Array<{ name: string; url: string; canon: string; sig: string }> = [
  {
    name: 'the ordinary case',
    url: 'http://m365-max-mcp:3000/attachment?t=abc',
    canon: 'v1\nhttp\nm365-max-mcp\n3000\n/attachment\nt=abc\n1780000000',
    sig: 'VamS9CzXX8uoCW4Z7nLUU6J-i2m5c0dJGUtemPtU5c0',
  },
  {
    name: "!*'() -- escaped by Python's quote(safe=''), left alone by encodeURIComponent",
    url: "http://host:3000/a?t=bang!star*quote'paren()",
    canon: 'v1\nhttp\nhost\n3000\n/a\nt=bang%21star%2Aquote%27paren%28%29\n1780000000',
    sig: 'GUmnhj_2TMTouQWeanlr_btQAI-nZhZua9D35ppWLkc',
  },
  {
    name: 'a literal + canonicalises as a space, per parse_qsl',
    url: 'http://host:3000/a?t=one+two',
    canon: 'v1\nhttp\nhost\n3000\n/a\nt=one%20two\n1780000000',
    sig: '33LcWPFmKsKkiPx5biIGghpZ3wF3xPf0KcEgEGSfxnE',
  },
  {
    name: 'parameters sort by (name, value)',
    url: 'http://host:3000/a?b=2&a=1&c=3',
    canon: 'v1\nhttp\nhost\n3000\n/a\na=1&b=2&c=3\n1780000000',
    sig: 'Ilaw_A28Kyc9HXNp6UE4xnM-709FRtbfaYZD814SeFg',
  },
  {
    name: 'pre-existing dgk/dgx/dgs are excluded from the signed query',
    url: 'http://host:3000/a?t=x&dgk=9&dgx=1&dgs=zzz',
    canon: 'v1\nhttp\nhost\n3000\n/a\nt=x\n1780000000',
    sig: 'PRQ9zzkkC6W_-xAj2fE2nW5rEctrDQnjt1p4sL1pOd0',
  },
];

describe('canonical string — cross-checked against docglean signing.py', () => {
  for (const vector of VECTORS) {
    it(vector.name, () => {
      expect(canonicalString(vector.url, EXPIRY)).toBe(vector.canon);
      expect(digest(KEY, vector.canon)).toBe(vector.sig);
    });
  }
});

describe('canonical string — structural rules', () => {
  it('writes the port explicitly even when it is the scheme default', () => {
    expect(canonicalString('https://h/a', EXPIRY)).toContain('\n443\n');
    expect(canonicalString('http://h/a', EXPIRY)).toContain('\n80\n');
  });

  it('treats an explicit default port as identical to an implied one', () => {
    expect(canonicalString('https://h:443/a', EXPIRY)).toBe(canonicalString('https://h/a', EXPIRY));
  });

  it('normalises an empty path to /', () => {
    expect(canonicalString('http://h:3000', EXPIRY)).toContain('\n/\n');
  });

  it('lowercases scheme and host but never the path', () => {
    expect(canonicalString('HTTP://HOST:3000/MixedCase', EXPIRY)).toBe(
      'v1\nhttp\nhost\n3000\n/MixedCase\n\n1780000000'
    );
  });

  it('signs the expiry, so two expiries never share a signature', () => {
    const a = digest(KEY, canonicalString('http://h:3000/a?t=x', '100'));
    const b = digest(KEY, canonicalString('http://h:3000/a?t=x', '200'));
    expect(a).not.toBe(b);
  });
});

describe('percent-encoding helpers match Python', () => {
  it('quoteAll escapes everything outside A-Za-z0-9_.-~', () => {
    expect(quoteAll('a~b_c.d-e')).toBe('a~b_c.d-e');
    expect(quoteAll("!*'()")).toBe('%21%2A%27%28%29');
    expect(quoteAll(' ')).toBe('%20');
    expect(quoteAll('é')).toBe('%C3%A9');
  });

  it('unquotePlus decodes a multi-byte sequence as one character', () => {
    expect(unquotePlus('caf%C3%A9')).toBe('café');
  });

  it('unquotePlus turns + into a space before decoding', () => {
    expect(unquotePlus('one+two')).toBe('one two');
    expect(unquotePlus('%2B')).toBe('+');
  });

  it('leaves a stray percent literal, as Python does', () => {
    expect(unquotePlus('100%off')).toBe('100%off');
  });
});

describe('parseQsl matches parse_qsl(keep_blank_values=True)', () => {
  it('keeps a parameter with no value', () => {
    expect(parseQsl('flag&t=x')).toEqual([
      ['flag', ''],
      ['t', 'x'],
    ]);
  });

  it('keeps a blank value', () => {
    expect(parseQsl('blank=&t=x')).toEqual([
      ['blank', ''],
      ['t', 'x'],
    ]);
  });

  it('skips empty segments', () => {
    expect(parseQsl('t=x&&u=y')).toEqual([
      ['t', 'x'],
      ['u', 'y'],
    ]);
  });

  it('splits on the first = only', () => {
    expect(parseQsl('t=a=b')).toEqual([['t', 'a=b']]);
  });
});

describe('compareByCodePoint', () => {
  it('orders a supplementary character above U+FFFF, unlike UTF-16 default sort', () => {
    const astral = '\u{1F600}';
    const bmpHigh = '＀';
    // The bug this function exists to avoid: JS default sort disagrees.
    expect([astral, bmpHigh].slice().sort()).toEqual([astral, bmpHigh]);
    expect([astral, bmpHigh].slice().sort(compareByCodePoint)).toEqual([bmpHigh, astral]);
  });

  it('is a total order consistent with equality', () => {
    expect(compareByCodePoint('a', 'a')).toBe(0);
    expect(compareByCodePoint('a', 'ab')).toBeLessThan(0);
  });
});

describe('signUrl', () => {
  const config = { key: KEY, keyId: '1', ttlSeconds: 120 };
  const NOW_MS = 1_780_000_000_000;

  it('appends dgk, dgx and dgs', () => {
    const signed = new URL(signUrl('http://h:3000/attachment?t=abc', config, NOW_MS));
    expect(signed.searchParams.get('dgk')).toBe('1');
    expect(signed.searchParams.get('dgx')).toBe(String(1_780_000_000 + 120));
    expect(signed.searchParams.get('dgs')).toBeTruthy();
    expect(signed.searchParams.get('t')).toBe('abc');
  });

  it('produces a signature that verifies against its own canonical string', () => {
    const signed = signUrl('http://h:3000/attachment?t=abc', config, NOW_MS);
    const parsed = new URL(signed);
    const dgx = parsed.searchParams.get('dgx')!;
    const dgs = parsed.searchParams.get('dgs')!;
    expect(digest(KEY, canonicalString(signed, dgx))).toBe(dgs);
  });

  it('drops a caller-supplied dgs rather than carrying two', () => {
    const signed = new URL(signUrl('http://h:3000/a?t=x&dgs=forged', config, NOW_MS));
    expect(signed.searchParams.getAll('dgs')).toHaveLength(1);
    expect(signed.searchParams.get('dgs')).not.toBe('forged');
  });

  it('changes the signature when the ticket changes', () => {
    const a = new URL(signUrl('http://h:3000/a?t=one', config, NOW_MS)).searchParams.get('dgs');
    const b = new URL(signUrl('http://h:3000/a?t=two', config, NOW_MS)).searchParams.get('dgs');
    expect(a).not.toBe(b);
  });

  it('changes the signature when the key changes', () => {
    const a = new URL(signUrl('http://h:3000/a?t=x', config, NOW_MS)).searchParams.get('dgs');
    const b = new URL(
      signUrl('http://h:3000/a?t=x', { ...config, key: 'other' }, NOW_MS)
    ).searchParams.get('dgs');
    expect(a).not.toBe(b);
  });
});
