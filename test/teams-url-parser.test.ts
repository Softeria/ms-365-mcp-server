import { describe, expect, it } from 'vitest';
import { parseTeamsUrl } from '../src/lib/teams-url-parser.js';

describe('parseTeamsUrl', () => {
  it('should pass through a full joinWebUrl unchanged', () => {
    const url =
      'https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc123%40thread.v2/0?context=%7b%22Tid%22%3a%22tenant-id%22%7d';
    expect(parseTeamsUrl(url)).toBe(url);
  });

  it('should pass through a short /meet/ URL unchanged', () => {
    const url = 'https://teams.microsoft.com/meet/29752586464443?p=abc123';
    expect(parseTeamsUrl(url)).toBe(url);
  });

  it('should convert a recap URL to a joinWebUrl', () => {
    const recapUrl =
      'https://teams.microsoft.com/v2/#/meetingrecap?threadId=19%3ameeting_abc123%40thread.v2&tenantId=tenant-123&organizerId=organizer-456';

    const result = parseTeamsUrl(recapUrl);

    expect(result).toContain('/l/meetup-join/');
    expect(result).toContain('19%3ameeting_abc123%40thread.v2');
    expect(result).toContain('context=');
    expect(result).toContain('tenant-123');
    expect(result).toContain('organizer-456');
  });

  it('should include Tid and Oid in the context JSON', () => {
    const recapUrl =
      'https://teams.microsoft.com/v2/#/meetingrecap?threadId=19%3ameeting_test%40thread.v2&tenantId=tid-abc&organizerId=oid-def';

    const result = parseTeamsUrl(recapUrl);

    // Extract and decode the context parameter
    const contextMatch = result.match(/context=(.+)$/);
    expect(contextMatch).toBeTruthy();
    const ctx = JSON.parse(decodeURIComponent(contextMatch![1]));
    expect(ctx.Tid).toBe('tid-abc');
    expect(ctx.Oid).toBe('oid-def');
  });

  it('should throw on recap URL missing required params', () => {
    const badUrl = 'https://teams.microsoft.com/v2/#/meetingrecap?threadId=19%3ameeting_abc';
    expect(() => parseTeamsUrl(badUrl)).toThrow('missing threadId, tenantId, or organizerId');
  });

  it('should return unknown URL formats as-is', () => {
    const unknownUrl = 'https://example.com/some-meeting';
    expect(parseTeamsUrl(unknownUrl)).toBe(unknownUrl);
  });

  it('should handle recap URL with mixed case meetingRecap', () => {
    const recapUrl =
      'https://teams.microsoft.com/v2/#/meetingRecap?threadId=19%3ameeting_x%40thread.v2&tenantId=t1&organizerId=o1';
    const result = parseTeamsUrl(recapUrl);
    expect(result).toContain('/l/meetup-join/');
  });
});
