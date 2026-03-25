import { describe, it, expect } from 'vitest';
import { wrapCache, unwrapCache, pickNewest } from '../src/auth.js';

describe('cache stamp', () => {
  describe('wrapCache / unwrapCache', () => {
    it('should round-trip data with a timestamp', () => {
      const wrapped = wrapCache('hello');
      const result = unwrapCache(wrapped);
      expect(result.data).toBe('hello');
      expect(result.savedAt).toBeTypeOf('number');
    });

    it('should return raw data without timestamp for unstamped strings', () => {
      const result = unwrapCache('{"some":"msal-cache"}');
      expect(result.data).toBe('{"some":"msal-cache"}');
      expect(result.savedAt).toBeUndefined();
    });

    it('should handle non-JSON strings', () => {
      const result = unwrapCache('not json at all');
      expect(result.data).toBe('not json at all');
      expect(result.savedAt).toBeUndefined();
    });
  });

  describe('pickNewest', () => {
    it('should return undefined when both are empty', () => {
      expect(pickNewest(undefined, undefined)).toBeUndefined();
    });

    it('should return keytar when only keytar has data', () => {
      expect(pickNewest('data', undefined)).toBe('data');
    });

    it('should return file when only file has data', () => {
      expect(pickNewest(undefined, 'data')).toBe('data');
    });

    it('should prefer keytar when neither is stamped', () => {
      expect(pickNewest('keytar-data', 'file-data')).toBe('keytar-data');
    });

    it('should prefer stamped over unstamped', () => {
      const stamped = wrapCache('new-data');
      expect(pickNewest('old-keytar', stamped)).toBe('new-data');
      expect(pickNewest(stamped, 'old-file')).toBe('new-data');
    });

    it('should prefer newer timestamp when both are stamped', () => {
      const older = JSON.stringify({ _cacheEnvelope: true, data: 'old', savedAt: 1000 });
      const newer = JSON.stringify({ _cacheEnvelope: true, data: 'new', savedAt: 2000 });
      expect(pickNewest(older, newer)).toBe('new');
      expect(pickNewest(newer, older)).toBe('new');
    });

    it('should prefer keytar when timestamps are equal', () => {
      const a = JSON.stringify({ _cacheEnvelope: true, data: 'keytar', savedAt: 1000 });
      const b = JSON.stringify({ _cacheEnvelope: true, data: 'file', savedAt: 1000 });
      expect(pickNewest(a, b)).toBe('keytar');
    });

    it('should unwrap stamped data when only one source exists', () => {
      const stamped = wrapCache('inner-data');
      expect(pickNewest(stamped, undefined)).toBe('inner-data');
      expect(pickNewest(undefined, stamped)).toBe('inner-data');
    });
  });
});
