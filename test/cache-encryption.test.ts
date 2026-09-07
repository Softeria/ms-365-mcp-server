import { describe, expect, it } from 'vitest';
import {
  CACHE_KEY_BYTES,
  decryptCache,
  encodeCacheKey,
  encryptCache,
  generateCacheKey,
  isEncryptedCache,
  parseCacheKey,
} from '../src/lib/cache-encryption.js';
import { wrapCache } from '../src/token-cache-storage.js';

describe('cache encryption', () => {
  const key = generateCacheKey();

  it('round-trips a v1 envelope through the ciphertext', () => {
    const plaintext = wrapCache('{"Account":{"uid":"x"}}');
    const encrypted = encryptCache(plaintext, key, 'token-cache');

    expect(encrypted).not.toContain('Account');
    expect(decryptCache(encrypted, key, 'token-cache')).toBe(plaintext);
  });

  it('produces a different ciphertext each time for the same input', () => {
    const first = encryptCache('same', key, 'token-cache');
    const second = encryptCache('same', key, 'token-cache');

    expect(first).not.toBe(second);
    expect(decryptCache(first, key, 'token-cache')).toBe(decryptCache(second, key, 'token-cache'));
  });

  it('rejects a ciphertext encrypted under a different key', () => {
    const encrypted = encryptCache('secret', key, 'token-cache');

    expect(() => decryptCache(encrypted, generateCacheKey(), 'token-cache')).toThrow();
  });

  it('rejects a tampered ciphertext', () => {
    const envelope = JSON.parse(encryptCache('secret', key, 'token-cache'));
    const data = Buffer.from(envelope.data, 'base64');
    data[0] ^= 0xff;
    envelope.data = data.toString('base64');

    expect(() => decryptCache(JSON.stringify(envelope), key, 'token-cache')).toThrow();
  });

  it('rejects a swapped iv', () => {
    const envelope = JSON.parse(encryptCache('secret', key, 'token-cache'));
    envelope.iv = JSON.parse(encryptCache('other', key, 'token-cache')).iv;

    expect(() => decryptCache(JSON.stringify(envelope), key, 'token-cache')).toThrow();
  });

  it('rejects a malformed iv or tag rather than passing it to the cipher', () => {
    const envelope = JSON.parse(encryptCache('secret', key, 'token-cache'));

    expect(() =>
      decryptCache(JSON.stringify({ ...envelope, iv: 'AAAA' }), key, 'token-cache')
    ).toThrow(/malformed iv or tag/);
    expect(() =>
      decryptCache(JSON.stringify({ ...envelope, tag: 'AAAA' }), key, 'token-cache')
    ).toThrow(/malformed iv or tag/);
  });

  // Both cache files share one key, so without the purpose binding either file would
  // authenticate as the other and could simply be copied over it.
  describe('purpose binding', () => {
    it('refuses a ciphertext written for the other cache file', () => {
      const encrypted = encryptCache('secret', key, 'selected-account');

      expect(() => decryptCache(encrypted, key, 'token-cache')).toThrow();
    });

    it('still opens under its own purpose', () => {
      const encrypted = encryptCache('secret', key, 'selected-account');

      expect(decryptCache(encrypted, key, 'selected-account')).toBe('secret');
    });
  });

  it('rejects an unknown algorithm', () => {
    const envelope = { ...JSON.parse(encryptCache('secret', key, 'token-cache')), alg: 'rot13' };

    expect(() => decryptCache(JSON.stringify(envelope), key, 'token-cache')).toThrow(/Unsupported/);
  });

  // A downgrade must not mistake a newer envelope for plaintext: v1 and v2 share the
  // _cacheEnvelope discriminator, so falling through would hand MSAL base64 ciphertext.
  describe('an envelope from a future version', () => {
    const future = JSON.stringify({
      ...JSON.parse(encryptCache('secret', key, 'token-cache')),
      v: 3,
    });

    it('is still recognised as ciphertext', () => {
      expect(isEncryptedCache(future)).toBe(true);
    });

    it('is rejected by name rather than decrypted', () => {
      expect(() => decryptCache(future, key, 'token-cache')).toThrow(/envelope version: 3/);
    });

    it('is rejected even when its shape is unrecognisable', () => {
      const reshaped = JSON.stringify({ _cacheEnvelope: true, v: 4, payload: 'whatever' });

      expect(isEncryptedCache(reshaped)).toBe(true);
      expect(() => decryptCache(reshaped, key, 'token-cache')).toThrow(/envelope version: 4/);
    });
  });

  describe('isEncryptedCache', () => {
    it('recognises its own output', () => {
      expect(isEncryptedCache(encryptCache('secret', key, 'token-cache'))).toBe(true);
    });

    it('does not mistake a v1 plaintext envelope for ciphertext', () => {
      expect(isEncryptedCache(wrapCache('plaintext'))).toBe(false);
    });

    it('does not mistake raw MSAL json or garbage for ciphertext', () => {
      expect(isEncryptedCache('{"Account":{}}')).toBe(false);
      expect(isEncryptedCache('not json at all')).toBe(false);
    });
  });

  describe('key encoding', () => {
    it('round-trips a generated key', () => {
      expect(parseCacheKey(encodeCacheKey(key))).toEqual(key);
    });

    it('tolerates surrounding whitespace from a key file', () => {
      expect(parseCacheKey(`  ${encodeCacheKey(key)}\n`)).toEqual(key);
    });

    it('rejects a key of the wrong length', () => {
      const short = Buffer.alloc(CACHE_KEY_BYTES - 1).toString('base64');

      expect(() => parseCacheKey(short)).toThrow(/must be 32 bytes/);
    });
  });
});
