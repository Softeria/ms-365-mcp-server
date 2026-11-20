import { ToolRefusal } from './types.js';

/**
 * Encodes a value for use in a Graph REST path segment. Preserves `=`
 * (Graph object ids are base64-ish and Graph 404s when padding is escaped to
 * `%3D`) while encoding everything else `encodeURIComponent` would. The
 * single established encoder for Graph path values — reuse this rather than
 * plain `encodeURIComponent` in any new path resolver.
 */
export function encodePathValue(value: string): string {
  return encodeURIComponent(value).replace(/%3D/g, '=');
}

/** A segment made entirely of `.` characters ('.', '..', '...', ...). */
const DOT_SEGMENT = /^\.+$/;

/**
 * True iff `value` is safe to use as a single opaque Graph path segment:
 * non-empty, not a dot segment ('.'/'..'/...), and without a path separator
 * ('/' or '\') that could inject extra segments, or ':' (Graph's
 * path-addressing syntax, e.g. `items/{id}:/sub/path:`). Graph ids never
 * contain any of these.
 *
 * A dot-segment or separator surviving into a resolved path can collapse via
 * URL dot-segment normalization (e.g. `/me/contacts/..` -> `/me/`), reaching
 * an entirely different Graph resource than the tool declares. Authorization
 * here is gated purely by `tool.name` (see `Policy.check`), never by the
 * resolved Graph path, so that collapse would let an allowed tool reach a
 * resource whose equivalent tool is denied.
 */
export function isSafePathSegment(value: string): boolean {
  return (
    value.length > 0 &&
    !DOT_SEGMENT.test(value) &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !value.includes(':')
  );
}

/**
 * Validates `value` with {@link isSafePathSegment} and encodes it with
 * {@link encodePathValue}. Throws rather than silently falling back to a
 * different path shape — the caller's surrounding try/catch turns this into
 * a clean tool-error result before any Graph call.
 */
export function requireSafePathSegment(value: string, paramName: string): string {
  if (!isSafePathSegment(value)) {
    throw new ToolRefusal(
      `${paramName} must be a single opaque id — not empty, not '.'/'..', and without '/', '\\', or ':'; got ${JSON.stringify(value)}`
    );
  }
  return encodePathValue(value);
}
