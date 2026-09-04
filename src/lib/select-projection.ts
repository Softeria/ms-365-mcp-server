/**
 * Graph honours $select on most operations, but not all: the onlineMeeting endpoints
 * return the entire resource no matter what is asked for (#660), costing several
 * thousand tokens per lookup and dragging joinInformation and the meeting passcode
 * through the model's context. Projection is therefore applied here as well, after the
 * response comes back. Where Graph already trimmed there is normally nothing left to
 * remove, though OData does allow a service to return supporting properties it was not
 * asked for, and those do get dropped.
 *
 * Projection is deny-by-default over a whole response body, so everything that is NOT a
 * selected entity property has to be accounted for: the collection envelope, the keys
 * this server adds itself, whatever $expand asked for, and the envelopes that carry
 * non-JSON payloads. Those are handled by isAlwaysKept and isTransportEnvelope below.
 */

/**
 * Splits a comma-separated list on the commas that separate its entries, ignoring the
 * ones inside an $expand option group. `attachments($select=id,name)` is one entry, not
 * two: splitting it naively yields a stray `name` that would then keep a top-level `name`
 * on the parent entity nobody asked for.
 */
function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of value) {
    if (char === '(') depth++;
    // Clamped so an unbalanced ')' cannot drive depth negative and swallow every
    // remaining comma.
    else if (char === ')') depth = Math.max(0, depth - 1);

    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  return parts;
}

/**
 * Splits a `$select` or `$expand` value into the top-level property names to keep.
 *
 * Nested paths (`onlineMeeting/joinUrl`) and $expand's nested options
 * (`attachments($select=id)`) are reduced to the property at their root, since trimming
 * inside a complex type is Graph's job and it either honoured the path already or
 * ignored the whole parameter.
 */
export function parseSelectFields(value: string | undefined): string[] {
  if (!value) return [];
  return [
    ...new Set(
      splitTopLevel(value)
        .map((field) => field.trim().split(/[/()]/)[0].trim())
        .filter(Boolean)
    ),
  ];
}

// Graph returns id and the @odata.* annotations regardless of $select, so stripping them
// here would take away fields the caller gets today. nextLink in particular is what
// fetchAllPages and manual paging resume from, and delta tombstones carry @removed.
// Underscore keys are this server's own additions rather than Graph properties: _etag is
// what --includeHeaders surfaces the ETag as, and dropping it would break read-then-PATCH
// for any caller that also passed select. Matched case-insensitively because this also
// runs over the names the model asked for, and a capitalised Id would otherwise slip past
// and make the anyFieldPresent guard inert.
function isAlwaysKept(key: string): boolean {
  return key.toLowerCase() === 'id' || key.startsWith('@') || key.startsWith('_');
}

/**
 * True for the wrappers GraphClient puts around payloads that are not Graph entities:
 * binary content, a verbatim non-JSON body, an empty 200, or an excludeResponse ack.
 * Projecting one of these would strip every key and hand the caller `{}`, losing a
 * transcript or a downloaded file outright.
 */
export function isTransportEnvelope(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const body = data as Record<string, unknown>;
  // Every wrapper GraphClient builds stamps message: 'OK!' - the binary one, the verbatim
  // text one and the empty-200 ack alike. Keying on that value rather than on property
  // names keeps real resources out of the guard: a fileAttachment carries contentBytes,
  // and plenty of resources carry a message.
  if (body.message === 'OK!') return true;
  // excludeResponse and the delete path return exactly { success: true }.
  return body.success === true && Object.keys(body).length === 1;
}

function candidateObjects(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter(isPlainObject);
  if (!isPlainObject(data)) return [];
  if (Array.isArray(data.value)) return data.value.filter(isPlainObject);
  return [data];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Whether the payload actually carries at least one of the requested fields.
 *
 * On the endpoints this exists for, Graph ignores $select and therefore never rejects a
 * misspelled property name. Without this check `select=joinUrl` (the property is
 * joinWebUrl) would silently reduce a full meeting to `{id}` instead of erroring.
 * Always-kept names are excluded from the test, so `select=id,joinUrl` is judged on
 * joinUrl alone. An empty collection counts as a match: nothing to lose by projecting it.
 */
export function anyFieldPresent(data: unknown, fields: string[]): boolean {
  // id and the annotation keys survive projection whether or not they were asked for, so
  // finding one proves nothing about whether Graph honoured the select. Counting them
  // made this guard inert for the select=id,subject,... shape the llmTips recommend.
  // With none left to check the caller only asked for always-kept fields, which projection
  // returns faithfully, so there is nothing to protect.
  const checkable = fields.filter((field) => !isAlwaysKept(field));
  if (checkable.length === 0) return true;

  const wanted = new Set(checkable.map((field) => field.toLowerCase()));
  const objects = candidateObjects(data);
  if (objects.length === 0) return true;
  return objects.some((item) => Object.keys(item).some((key) => wanted.has(key.toLowerCase())));
}

function projectObject(item: unknown, wanted: Set<string>): unknown {
  if (!isPlainObject(item)) return item;
  const projected: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (isAlwaysKept(key) || wanted.has(key.toLowerCase())) {
      projected[key] = value;
    }
  }
  return projected;
}

/**
 * Narrows a Graph response body to the requested fields. Handles both a single resource
 * and a collection, leaving the collection's own envelope (@odata.count, @odata.nextLink)
 * intact and projecting only the items inside `value`.
 *
 * Matching is case-insensitive because the tool schema takes `select` as free text and
 * models are inconsistent about casing. That only ever makes this more lenient than
 * Graph: where Graph honours $select a mis-cased name fails before a body exists.
 */
export function projectSelectedFields(data: unknown, fields: string[]): unknown {
  if (fields.length === 0) return data;
  if (!data || typeof data !== 'object') return data;

  const wanted = new Set(fields.map((field) => field.toLowerCase()));

  if (Array.isArray(data)) {
    return data.map((item) => projectObject(item, wanted));
  }

  const body = data as Record<string, unknown>;
  if (Array.isArray(body.value)) {
    return { ...body, value: body.value.map((item) => projectObject(item, wanted)) };
  }

  return projectObject(body, wanted);
}
