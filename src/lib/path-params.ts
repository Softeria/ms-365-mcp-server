/**
 * Microsoft's OpenAPI metadata omits path parameters from the parameter list of most
 * operations, so they are synthesized — in `generated/hack.ts` for endpoints the
 * generated client already knows about, and in `graph-tools.ts` for the rest.
 *
 * Both used to emit `Path parameter: messageId`, which tells the model nothing about
 * where the value comes from. Because Graph listings return the identifier under the
 * generic key `id`, models passed `id`, the `:messageId` placeholder was never
 * substituted, and the request went to a literal `/me/messages/:messageId`.
 *
 * Keep this in one place so both synthesis sites stay in sync.
 */
export function describePathParam(pathParamName: string): string {
  const match = /^(.*?)Id(\d*)$/.exec(pathParamName);
  if (match && match[1]) {
    const base =
      `Value for the '${pathParamName}' path segment. ` +
      `Pass it under the name '${pathParamName}', not as 'id'. `;

    // A numeric suffix means the path names the same resource type twice — in
    // /messages/:chatMessageId/replies/:chatMessageId1 the numbered one is the reply, not
    // the parent — so say which is which rather than naming one object for both.
    if (match[2]) {
      return (
        base +
        `It identifies a different resource from the similarly named parameter ` +
        `without the number; check the tool's path to see which.`
      );
    }

    const resource = match[1].replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
    // 'directoryObjectId' would otherwise read "the directory object object".
    const noun = /(^|\s)object$/.test(resource) ? resource : `${resource} object`;
    // Not every resource has a list tool — placeId, plannerPlanId and
    // virtualEventWebinarId do not — so point at Graph rather than promising a tool.
    return base + `Use the 'id' field of the ${noun} as returned by Microsoft Graph.`;
  }

  // Not an identifier — say nothing about where the value comes from. Function-style
  // segments are caller-supplied values, not ids looked up beforehand: 'address' is an
  // A1 range, 'q' is search text, 'index' selects a position. Claiming they come from a
  // list or get response would steer the model to the wrong value.
  return `Value for the '${pathParamName}' path segment.`;
}
