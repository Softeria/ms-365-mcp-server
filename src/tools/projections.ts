/**
 * Minimal field projections applied server-side to read tools.
 *
 * A read tool declares `projection: <ResourceKind>` on its {@link Tool} def.
 * When the caller omits `$select` (and does not pass `response_format: 'detailed'`),
 * the runtime injects the resource's `Minimal*` field set so a careless call
 * cannot dump Graph's full 30–50-field object into the model context. The
 * caller can always pass an explicit `$select`, or `response_format: 'detailed'`,
 * to lift the projection.
 *
 * Keep these lists high-signal: the fields an agent needs to triage or to
 * obtain an id for a follow-up call. Full bodies / extended properties are an
 * opt-in (`detailed` or an explicit `$select`/`$expand`).
 */
export type ResourceKind =
  | 'mail'
  | 'event'
  | 'driveItem'
  | 'user'
  | 'contact'
  | 'person'
  | 'mailFolder'
  | 'attachment'
  | 'site'
  | 'drive'
  | 'list';

export const MINIMAL_SELECT: Record<ResourceKind, string> = {
  mail: 'id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,hasAttachments,conversationId',
  event: 'id,subject,start,end,location,organizer,attendees,isAllDay,isCancelled,onlineMeeting',
  driveItem: 'id,name,size,folder,file,webUrl,lastModifiedDateTime',
  user: 'id,displayName,userPrincipalName,mail,jobTitle,department',
  person: 'id,displayName,scoredEmailAddresses,jobTitle,companyName,personType',
  mailFolder: 'id,displayName,parentFolderId,childFolderCount,unreadItemCount,totalItemCount',
  // Never contentBytes: Graph inlines base64 file content in attachment listings.
  attachment: 'id,name,contentType,size,isInline',
  site: 'id,displayName,name,webUrl,description',
  drive: 'id,name,driveType,webUrl',
  list: 'id,displayName,name,webUrl,list',
  // categories is a business-classification tag, useful at list time; personalNotes is
  // a private free-text annotation omitted from the default compact listing — not an
  // authorization boundary: an explicit $select=personalNotes, or response_format:
  // 'detailed', on contact-list also returns it, same as contact-get.
  contact:
    'id,displayName,givenName,surname,companyName,jobTitle,emailAddresses,businessPhones,mobilePhone,categories,parentFolderId',
};
