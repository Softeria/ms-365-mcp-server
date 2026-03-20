import { describe, expect, it } from 'vitest';
import {
  extractSharedFiles,
  escapeMd,
  type ChatMessage,
} from '../src/lib/meeting-files-extractor.js';

describe('extractSharedFiles', () => {
  it('should extract reference attachments as shared files', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        createdDateTime: '2026-03-20T10:00:00Z',
        from: { user: { displayName: 'Marc Bourget' } },
        attachments: [
          {
            name: 'architecture.pptx',
            contentType: 'reference',
            contentUrl:
              'https://contoso.sharepoint.com/sites/team/Shared%20Documents/architecture.pptx',
          },
        ],
      },
      {
        id: 'msg-2',
        createdDateTime: '2026-03-20T10:05:00Z',
        from: { user: { displayName: 'Clara Dupont' } },
        attachments: [
          {
            name: 'budget.xlsx',
            contentType: 'reference',
            contentUrl: 'https://contoso.sharepoint.com/sites/team/Shared%20Documents/budget.xlsx',
          },
        ],
      },
    ];

    const files = extractSharedFiles(messages);
    expect(files).toHaveLength(2);
    expect(files[0]).toEqual({
      name: 'architecture.pptx',
      contentUrl: 'https://contoso.sharepoint.com/sites/team/Shared%20Documents/architecture.pptx',
      contentType: 'reference',
      sharedBy: 'Marc Bourget',
      sharedAt: '2026-03-20T10:00:00Z',
      messageId: 'msg-1',
    });
    expect(files[1].sharedBy).toBe('Clara Dupont');
  });

  it('should return empty array for messages without attachments', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        createdDateTime: '2026-03-20T10:00:00Z',
        from: { user: { displayName: 'Alice' } },
      },
      { id: 'msg-2', attachments: [] },
    ];
    expect(extractSharedFiles(messages)).toEqual([]);
  });

  it('should only extract reference attachments, not cards or other types', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        createdDateTime: '2026-03-20T10:00:00Z',
        from: { user: { displayName: 'Bob' } },
        attachments: [
          {
            name: 'doc.pdf',
            contentType: 'reference',
            contentUrl: 'https://contoso.sharepoint.com/doc.pdf',
          },
          {
            name: 'adaptive-card',
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: undefined,
          },
          {
            name: 'code.py',
            contentType: 'application/vnd.microsoft.card.codesnippet',
            contentUrl: undefined,
          },
        ],
      },
    ];

    const files = extractSharedFiles(messages);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('doc.pdf');
  });

  it('should handle missing fields gracefully', () => {
    const messages: ChatMessage[] = [
      {
        id: undefined,
        createdDateTime: undefined,
        from: undefined,
        attachments: [
          {
            name: undefined,
            contentType: 'reference',
            contentUrl: 'https://contoso.sharepoint.com/file.docx',
          },
        ],
      },
    ];

    const files = extractSharedFiles(messages);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('unknown');
    expect(files[0].sharedBy).toBe('unknown');
    expect(files[0].sharedAt).toBe('');
    expect(files[0].messageId).toBe('');
  });

  it('should handle application sender (bot) correctly', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-bot',
        createdDateTime: '2026-03-20T10:10:00Z',
        from: { application: { displayName: 'OneDrive Bot' } },
        attachments: [
          {
            name: 'report.pdf',
            contentType: 'reference',
            contentUrl: 'https://contoso.sharepoint.com/report.pdf',
          },
        ],
      },
    ];

    const files = extractSharedFiles(messages);
    expect(files).toHaveLength(1);
    expect(files[0].sharedBy).toBe('OneDrive Bot');
  });

  it('should handle empty messages array', () => {
    expect(extractSharedFiles([])).toEqual([]);
  });

  it('should extract multiple files from a single message', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-multi',
        createdDateTime: '2026-03-20T10:00:00Z',
        from: { user: { displayName: 'Alice' } },
        attachments: [
          {
            name: 'file1.pdf',
            contentType: 'reference',
            contentUrl: 'https://contoso.sharepoint.com/file1.pdf',
          },
          {
            name: 'file2.docx',
            contentType: 'reference',
            contentUrl: 'https://contoso.sharepoint.com/file2.docx',
          },
        ],
      },
    ];

    const files = extractSharedFiles(messages);
    expect(files).toHaveLength(2);
    expect(files[0].name).toBe('file1.pdf');
    expect(files[1].name).toBe('file2.docx');
  });

  it('should reject URLs from untrusted domains', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-phish',
        createdDateTime: '2026-03-20T10:00:00Z',
        from: { user: { displayName: 'Attacker' } },
        attachments: [
          {
            name: 'legit-looking.pdf',
            contentType: 'reference',
            contentUrl: 'https://evil-site.com/phishing.pdf',
          },
          {
            name: 'internal.pdf',
            contentType: 'reference',
            contentUrl: 'https://192.168.1.1/internal/secret.pdf',
          },
          {
            name: 'fake-sharepoint.pdf',
            contentType: 'reference',
            contentUrl: 'https://sharepoint.com.evil.com/file.pdf',
          },
        ],
      },
    ];

    const files = extractSharedFiles(messages);
    expect(files).toHaveLength(0);
  });

  it('should accept URLs from all trusted Microsoft domains', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-trusted',
        createdDateTime: '2026-03-20T10:00:00Z',
        from: { user: { displayName: 'User' } },
        attachments: [
          {
            name: 'sp.pdf',
            contentType: 'reference',
            contentUrl: 'https://tenant.sharepoint.com/file.pdf',
          },
          {
            name: 'od.pdf',
            contentType: 'reference',
            contentUrl: 'https://tenant-my.onedrive.com/file.pdf',
          },
          {
            name: 'office.pdf',
            contentType: 'reference',
            contentUrl: 'https://tenant.office.com/file.pdf',
          },
        ],
      },
    ];

    const files = extractSharedFiles(messages);
    expect(files).toHaveLength(3);
  });

  it('should handle malformed contentUrl gracefully', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-bad',
        attachments: [
          {
            name: 'bad.pdf',
            contentType: 'reference',
            contentUrl: 'not-a-valid-url',
          },
        ],
      },
    ];

    const files = extractSharedFiles(messages);
    expect(files).toHaveLength(0);
  });
});

describe('escapeMd', () => {
  it('should escape Markdown special characters', () => {
    expect(escapeMd('**bold**')).toBe('\\*\\*bold\\*\\*');
    expect(escapeMd('[link](url)')).toBe('\\[link\\]\\(url\\)');
    expect(escapeMd('`code`')).toBe('\\`code\\`');
    expect(escapeMd('# heading')).toBe('\\# heading');
  });

  it('should leave plain text unchanged', () => {
    expect(escapeMd('hello world')).toBe('hello world');
    expect(escapeMd('file.pdf')).toBe('file.pdf');
  });

  it('should handle empty string', () => {
    expect(escapeMd('')).toBe('');
  });
});
