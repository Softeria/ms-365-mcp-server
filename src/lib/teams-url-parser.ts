/**
 * Converts any Teams meeting URL format into a standard joinWebUrl
 * usable with the list-online-meetings $filter=joinWebUrl eq '...' query.
 *
 * Supported formats:
 * - Short URL: https://teams.microsoft.com/meet/29752586464443?p=...
 * - Full joinWebUrl: https://teams.microsoft.com/l/meetup-join/19%3ameeting_.../0?context=...
 * - Recap URL: https://teams.microsoft.com/v2/#/meetingrecap?threadId=...&tenantId=...&organizerId=...
 */
export function parseTeamsUrl(url: string): string {
  // Format 1 & 2: Already a joinWebUrl or short /meet/ URL — pass through
  if (url.includes('/meet/') || url.includes('/meetup-join/')) {
    return url;
  }

  // Format 3: Recap URL — extract params and reconstruct joinWebUrl
  if (url.toLowerCase().includes('meetingrecap')) {
    const params = Object.fromEntries(
      [...url.matchAll(/([a-zA-Z]+)=([^&#]+)/g)].map((m) => [m[1], m[2]])
    );
    const threadId = decodeURIComponent(params.threadId || '');
    const tenantId = params.tenantId || '';
    const organizerId = params.organizerId || '';

    if (!threadId || !tenantId || !organizerId) {
      throw new Error('Invalid recap URL: missing threadId, tenantId, or organizerId parameter');
    }

    const threadEnc = encodeURIComponent(threadId).replace(/%3A/gi, '%3a').replace(/%40/gi, '%40');
    const ctx = JSON.stringify({ Tid: tenantId, Oid: organizerId });
    const ctxEnc = encodeURIComponent(ctx);

    return `https://teams.microsoft.com/l/meetup-join/${threadEnc}/0?context=${ctxEnc}`;
  }

  // Unknown format — return as-is
  return url;
}
