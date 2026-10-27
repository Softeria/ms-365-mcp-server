// Log descriptions that carry operational metadata only. Tool parameters,
// request bodies, paths, query strings, upstream error messages and crash
// dumps can hold the text of a user's mail, calendar entries and file names;
// none of that belongs in a log file or in a console stream a platform
// collects. Nothing here copies a string it was given: it reports counts,
// sizes, numbers, and names only when they are on a fixed list.

const MAX_LISTED = 40;

// Parameter names a tool call can carry that say nothing about the user's data.
const KNOWN_PARAM_NAMES = new Set([
  'top',
  'skip',
  'skiptoken',
  'search',
  'filter',
  'count',
  'orderby',
  'select',
  'expand',
  'fetchAllPages',
  'includeHeaders',
  'excludeResponse',
  'includeHiddenMessages',
  'confirm',
  'timezone',
  'expandExtendedProperties',
  'body',
  'rawResponse',
  'blobOutput',
  'forceJsonOutput',
  'method',
  'apiVersion',
  'queryParams',
  'headers',
  'accessToken',
  'maxChars',
  'maxPages',
  'maxItems',
  'messageId',
  'messageIds',
  'mailFolderId',
  'folderId',
  'eventId',
  'calendarId',
  'contactId',
  'contactFolderId',
  'attachmentId',
  'driveId',
  'driveItemId',
  'itemId',
  'siteId',
  'listId',
  'userId',
  'teamId',
  'channelId',
  'chatId',
  'planId',
  'taskId',
  'bucketId',
  'notebookId',
  'sectionId',
  'pageId',
  'subscriptionId',
  'target',
  'name',
  'contentType',
  'If-Match',
  'Prefer',
  'outputFormat',
  'skipEncoding',
]);

// Fixed words of Microsoft Graph paths. Any other segment is an id, a file name or
// an address and is shown as {…}.
const KNOWN_PATH_SEGMENTS = new Set([
  'v1.0',
  'beta',
  'me',
  'users',
  'messages',
  'mailFolders',
  'childFolders',
  'attachments',
  'events',
  'calendar',
  'calendars',
  'calendarView',
  'calendarGroups',
  'instances',
  'contacts',
  'contactFolders',
  'drive',
  'drives',
  'items',
  'root',
  'children',
  'content',
  'thumbnails',
  'delta',
  'search',
  'sites',
  'lists',
  'columns',
  'contentTypes',
  'teams',
  'channels',
  'chats',
  'members',
  'tabs',
  'planner',
  'plans',
  'buckets',
  'tasks',
  'todo',
  'onenote',
  'notebooks',
  'sections',
  'pages',
  'people',
  'photo',
  'mailboxSettings',
  'subscriptions',
  'outlook',
  'masterCategories',
  'inbox',
  'drafts',
  'sentitems',
  'deleteditems',
  'archive',
  'junkemail',
  'sendMail',
  'reply',
  'replyAll',
  'forward',
  'move',
  'copy',
  'send',
  'createReply',
  'createReplyAll',
  'createForward',
  'accept',
  'decline',
  'tentativelyAccept',
  'cancel',
  'getSchedule',
  'findMeetingTimes',
  'createUploadSession',
  'invite',
  'permissions',
  'joinedTeams',
  'memberOf',
  'getMemberGroups',
  'extensions',
  'organization',
  'reminderView',
  'workbook',
  'worksheets',
  'tables',
  'range',
  'usedRange',
  'presence',
  'onlineMeetings',
  '$batch',
  '$value',
  '$count',
  '$ref',
]);

// Error codes worth seeing in a log. Anything else is counted, not copied.
const KNOWN_ERROR_CODES = new Set([
  'BadRequest',
  'Unauthorized',
  'Forbidden',
  'NotFound',
  'Conflict',
  'TooManyRequests',
  'ServiceUnavailable',
  'InternalServerError',
  'InvalidAuthenticationToken',
  'InvalidRequest',
  'ResourceNotFound',
  'itemNotFound',
  'invalidRequest',
  'accessDenied',
  'generalException',
  'serviceNotAvailable',
  'activityLimitReached',
  'quotaLimitReached',
  'unauthenticated',
  'notAllowed',
  'notSupported',
  'nameAlreadyExists',
  'invalidRange',
  'malwareDetected',
  'resyncRequired',
  'SearchWithFilter',
  'InefficientFilter',
  'RequestBroker--ParseUri',
  'ErrorAccessDenied',
  'ErrorItemNotFound',
  'ErrorInvalidIdMalformed',
  'ErrorInvalidMailboxItemId',
  'ErrorInvalidRequest',
  'ErrorInvalidUser',
  'ErrorInvalidRecipients',
  'ErrorSendAsDenied',
  'ErrorPropertyValidationFailure',
  'ErrorInvalidPropertyRequest',
  'ErrorMessageSizeExceeded',
  'ErrorQuotaExceeded',
  'ErrorMailboxNotEnabledForRESTAPI',
  'MailboxNotEnabledForRESTAPI',
  'ErrorInvalidOperation',
  'ErrorObjectTypeChanged',
  'ErrorIrresolvableConflict',
  'ErrorInternalServerError',
  'ErrorTimeoutExpired',
  'ErrorServerBusy',
  'ApplicationThrottled',
  'MailboxConcurrency',
  'ErrorInvalidAttachmentId',
  'ErrorAttachmentSizeLimitExceeded',
  'ErrorCalendarMeetingRequestIsOutOfDate',
  'ErrorCalendarIsOrganizer',
  'ErrorCalendarIsNotOrganizer',
  'ErrorOccurrenceCrossingBoundary',
  'ErrorSchemaValidation',
  'ErrorInvalidPropertySet',
  'invalid_grant',
  'invalid_client',
  'invalid_request',
  'invalid_scope',
  'unauthorized_client',
  'interaction_required',
  'consent_required',
  'login_required',
  'access_denied',
  'temporarily_unavailable',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ERR_NETWORK',
  'ERR_SOCKET_TIMEOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
  'ABORT_ERR',
  'ERR_FR_TOO_MANY_REDIRECTS',
]);

function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `string(${value.length})`;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `array(${value.length})`;
  if (typeof value === 'object') return `object(${Object.keys(value as object).length} keys)`;
  return typeof value;
}

/**
 * `{top: 10, filter: string(42), body: object(3 keys), +2 other}` — only names on the
 * fixed list are shown; every other key is counted. String values are lengths.
 */
export function describeShape(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return describeValue(value);
  }
  const entries = Object.entries(value as Record<string, unknown>);
  const shown: string[] = [];
  let other = 0;
  for (const [k, v] of entries) {
    if (KNOWN_PARAM_NAMES.has(k) && shown.length < MAX_LISTED)
      shown.push(`${k}: ${describeValue(v)}`);
    else other += 1;
  }
  if (other > 0) shown.push(`+${other} other`);
  return `{${shown.join(', ')}}`;
}

/** Byte length of a value as it would be serialized, or -1 if it cannot be. */
export function serializedSize(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value) ?? '');
  } catch {
    return -1;
  }
}

/**
 * A URL or path with every segment that is not a fixed Graph word replaced by {…},
 * the query string dropped, and only `$`-prefixed OData query names listed; others
 * are counted. Never throws.
 */
export function describeUrl(url: string): string {
  if (typeof url !== 'string') return typeof url;
  let origin = '';
  let rest = url;
  const schemeEnd = url.indexOf('://');
  if (schemeEnd > 0) {
    const pathStart = url.indexOf('/', schemeEnd + 3);
    origin = pathStart === -1 ? url : url.slice(0, pathStart);
    rest = pathStart === -1 ? '' : url.slice(pathStart);
  }
  const q = rest.indexOf('?');
  const pathPart = q === -1 ? rest : rest.slice(0, q);
  const queryPart = q === -1 ? '' : rest.slice(q + 1);
  const segments = pathPart.split('/').map((s) => {
    if (s === '') return '';
    const bare = s.endsWith(':') ? s.slice(0, -1) : s;
    return KNOWN_PATH_SEGMENTS.has(bare) ? s : '{…}';
  });
  let out = `${/^https?:\/\/[A-Za-z0-9.-]+(:\d+)?$/.test(origin) ? origin : origin ? '{origin}' : ''}${segments.join('/')}`;
  if (queryPart) {
    const names: string[] = [];
    let other = 0;
    for (const part of queryPart.split('&')) {
      const name = part.split('=')[0];
      if (!name) continue;
      if (/^\$[a-z]{1,20}$/.test(name)) {
        if (!names.includes(name)) names.push(name);
      } else other += 1;
    }
    const list = names.join(', ') + (other ? `${names.length ? ', ' : ''}+${other} other` : '');
    out += ` [query: ${list}]`;
  }
  return out;
}

const KNOWN_ERROR_NAMES = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'SyntaxError',
  'AbortError',
  'TimeoutError',
  'GraphApiError',
  'OAuthUpstreamError',
  'FetchError',
  'AggregateError',
  'DOMException',
  'TicketStoreFullError',
  'ClientAuthError',
  'ServerError',
  'InteractionRequiredAuthError',
  'AuthError',
  'BrowserAuthError',
]);

/**
 * `GraphApiError status=400 code=BadRequest` — the message is left out: a Graph
 * error echoes the request. The name is shown only if it is a known class, the
 * status only if it is an HTTP status, the code only if it is a short token.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return `non-error(${typeof error})`;
  const e = error as Error & {
    code?: unknown;
    status?: unknown;
    httpStatus?: unknown;
    graphErrorCode?: unknown;
    errorCode?: unknown;
  };
  const parts = [KNOWN_ERROR_NAMES.has(e.name) ? e.name : 'Error'];
  const status = [e.httpStatus, e.status].find(
    (s) => Number.isInteger(s) && (s as number) >= 100 && (s as number) <= 599
  );
  if (status !== undefined) parts.push(`status=${status}`);
  const code = [e.graphErrorCode, e.code, e.errorCode].find((c) => c !== undefined && c !== null);
  if (typeof code === 'number' && Number.isInteger(code)) parts.push(`code=${code}`);
  else if (typeof code === 'string') {
    parts.push(KNOWN_ERROR_CODES.has(code) ? `code=${code}` : `code=unlisted(${code.length})`);
  }
  return parts.join(' ');
}

/** Stack frames only (`at …` lines): code locations, never the message line. */
export function describeStack(error: unknown): string[] {
  if (!(error instanceof Error) || typeof error.stack !== 'string') return [];
  return error.stack
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('at '))
    .slice(0, 20);
}
