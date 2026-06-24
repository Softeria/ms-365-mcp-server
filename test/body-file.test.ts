import { describe, it, expect } from 'vitest';
import { inferContentType, setByPath, applyBodyFile } from '../src/lib/body-file.js';

describe('body-file helper', () => {
  describe('inferContentType', () => {
    it('maps .html and .htm to html (case-insensitive)', () => {
      expect(inferContentType('/tmp/newsletter.html')).toBe('html');
      expect(inferContentType('/tmp/page.HTM')).toBe('html');
      expect(inferContentType('C:\\mail\\Body.Html')).toBe('html');
    });

    it('maps everything else to text', () => {
      expect(inferContentType('/tmp/body.txt')).toBe('text');
      expect(inferContentType('/tmp/body')).toBe('text');
      expect(inferContentType('/tmp/body.md')).toBe('text');
    });
  });

  describe('setByPath', () => {
    it('sets a nested leaf, creating intermediate objects', () => {
      const target: Record<string, unknown> = {};
      setByPath(target, 'message.body.content', 'hello');
      expect(target).toEqual({ message: { body: { content: 'hello' } } });
    });

    it('preserves sibling keys at every level', () => {
      const target: Record<string, unknown> = {
        message: { subject: 'Hi', body: { contentType: 'text' }, toRecipients: [{ x: 1 }] },
      };
      setByPath(target, 'message.body.content', 'world');
      expect(target).toEqual({
        message: {
          subject: 'Hi',
          body: { contentType: 'text', content: 'world' },
          toRecipients: [{ x: 1 }],
        },
      });
    });

    it('replaces a non-object node in the path with an object', () => {
      const target: Record<string, unknown> = { message: { body: 'oops' } };
      setByPath(target, 'message.body.content', 'fixed');
      expect(target).toEqual({ message: { body: { content: 'fixed' } } });
    });

    it('handles a single-segment path', () => {
      const target: Record<string, unknown> = { keep: 1 };
      setByPath(target, 'comment', 'reply text');
      expect(target).toEqual({ keep: 1, comment: 'reply text' });
    });

    it('reuses an existing key that differs only in case (no duplicate)', () => {
      // The Graph sendMail action wrapper is `Message`; writing `Message.body.content`
      // must land inside it, not create a second key.
      const target: Record<string, unknown> = {
        Message: { toRecipients: [{ emailAddress: { address: 'a@b.com' } }] },
      };
      setByPath(target, 'Message.body.content', 'hi');
      expect(Object.keys(target)).toEqual(['Message']);
      expect(target).toEqual({
        Message: {
          toRecipients: [{ emailAddress: { address: 'a@b.com' } }],
          body: { content: 'hi' },
        },
      });
    });

    it('matches case-insensitively when target casing differs from caller casing', () => {
      // Config says `Message.*` but caller used lowercase `message`: reuse it.
      const target: Record<string, unknown> = { message: { subject: 'Hi' } };
      setByPath(target, 'Message.body.content', 'hi');
      expect(Object.keys(target)).toEqual(['message']);
      expect(target).toEqual({ message: { subject: 'Hi', body: { content: 'hi' } } });
    });
  });

  describe('applyBodyFile', () => {
    const config = {
      contentTarget: 'message.body.content',
      contentTypeTarget: 'message.body.contentType',
    };

    it('writes content and content type without clobbering caller fields', () => {
      const result = applyBodyFile(
        {
          message: { subject: 'Report', toRecipients: [{ emailAddress: { address: 'a@b.com' } }] },
        },
        config,
        '<h1>Hi</h1>',
        'html'
      );
      expect(result).toEqual({
        message: {
          subject: 'Report',
          toRecipients: [{ emailAddress: { address: 'a@b.com' } }],
          body: { content: '<h1>Hi</h1>', contentType: 'html' },
        },
      });
    });

    it('overrides any inline content already present', () => {
      const result = applyBodyFile(
        { message: { body: { content: 'OLD', contentType: 'text' } } },
        config,
        'NEW',
        'html'
      );
      expect((result.message as any).body).toEqual({ content: 'NEW', contentType: 'html' });
    });

    it('does not mutate the input object', () => {
      const input = { message: { subject: 'x' } };
      const result = applyBodyFile(input, config, 'body', 'text');
      expect(input).toEqual({ message: { subject: 'x' } });
      expect(result).not.toBe(input);
    });

    it('treats null/non-object body as an empty object', () => {
      expect(applyBodyFile(null, config, 'c', 'text')).toEqual({
        message: { body: { content: 'c', contentType: 'text' } },
      });
      expect(applyBodyFile(undefined, { contentTarget: 'body.content' }, 'c', 'text')).toEqual({
        body: { content: 'c' },
      });
    });

    it('omits the content type when no contentTypeTarget is configured', () => {
      const result = applyBodyFile({}, { contentTarget: 'comment' }, 'reply', 'html');
      expect(result).toEqual({ comment: 'reply' });
    });
  });
});
