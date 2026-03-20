/**
 * Extracts shared files from Teams chat messages.
 * Files shared in meetings appear as chatMessageAttachment with contentType === 'reference',
 * pointing to SharePoint/OneDrive resources.
 */

export interface SharedFile {
  name: string;
  contentUrl: string;
  contentType: string;
  sharedBy: string;
  sharedAt: string;
  messageId: string;
}

export interface ChatMessage {
  id?: string;
  createdDateTime?: string;
  from?: {
    user?: { displayName?: string };
    application?: { displayName?: string };
  };
  attachments?: Array<{
    name?: string;
    contentType?: string;
    contentUrl?: string;
  }>;
}

export function extractSharedFiles(messages: ChatMessage[]): SharedFile[] {
  const files: SharedFile[] = [];

  for (const msg of messages) {
    if (!msg.attachments?.length) continue;

    for (const att of msg.attachments) {
      if (att.contentType === 'reference' && att.contentUrl) {
        files.push({
          name: att.name || 'unknown',
          contentUrl: att.contentUrl,
          contentType: att.contentType,
          sharedBy: msg.from?.user?.displayName || msg.from?.application?.displayName || 'unknown',
          sharedAt: msg.createdDateTime || '',
          messageId: msg.id || '',
        });
      }
    }
  }

  return files;
}
