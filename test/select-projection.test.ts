import { describe, it, expect } from 'vitest';
import {
  anyFieldPresent,
  isTransportEnvelope,
  parseSelectFields,
  projectSelectedFields,
} from '../src/lib/select-projection.js';

describe('parseSelectFields', () => {
  it('splits and trims a comma-separated list', () => {
    expect(parseSelectFields('id, subject ,joinWebUrl')).toEqual(['id', 'subject', 'joinWebUrl']);
  });

  it('keeps only the top-level segment of a nested path', () => {
    expect(parseSelectFields('onlineMeeting/joinUrl,subject')).toEqual([
      'onlineMeeting',
      'subject',
    ]);
  });

  // $expand carries nested options; only the navigation property itself matters here.
  it('reduces an $expand with nested options to the property name', () => {
    expect(parseSelectFields('attachments($select=id)')).toEqual(['attachments']);
  });

  // A comma inside the option group separates the nested select, not two expands.
  // Splitting on it would yield a stray `name` that keeps the parent's own top-level
  // name field, which nobody selected.
  it('does not split on a comma inside an $expand option group', () => {
    expect(parseSelectFields('attachments($select=id,name),subject')).toEqual([
      'attachments',
      'subject',
    ]);
  });

  it('handles nested option groups', () => {
    expect(parseSelectFields('members($expand=user($select=id,displayName)),subject')).toEqual([
      'members',
      'subject',
    ]);
  });

  // Graph would reject these, but they must not cost us the fields that follow.
  it('recovers from unbalanced parentheses', () => {
    expect(parseSelectFields('attachments($select=id')).toEqual(['attachments']);
    expect(parseSelectFields('a),subject')).toEqual(['a', 'subject']);
  });

  it('de-duplicates', () => {
    expect(parseSelectFields('id,id,subject')).toEqual(['id', 'subject']);
  });

  it('returns nothing for an absent or empty value', () => {
    expect(parseSelectFields(undefined)).toEqual([]);
    expect(parseSelectFields('')).toEqual([]);
    expect(parseSelectFields(' , ,')).toEqual([]);
  });
});

describe('isTransportEnvelope', () => {
  it('recognises the binary wrapper', () => {
    expect(
      isTransportEnvelope({ message: 'OK!', contentType: 'video/mp4', contentBytes: 'AAA' })
    ).toBe(true);
  });

  it('recognises the raw-text wrapper used for VTT and downloads', () => {
    expect(isTransportEnvelope({ message: 'OK!', rawResponse: 'WEBVTT...' })).toBe(true);
  });

  it('recognises the empty-body and excludeResponse acks', () => {
    expect(isTransportEnvelope({ message: 'OK!' })).toBe(true);
    expect(isTransportEnvelope({ success: true })).toBe(true);
  });

  it('does not mistake a real resource or collection for an envelope', () => {
    expect(isTransportEnvelope({ id: '1', subject: 'a' })).toBe(false);
    expect(isTransportEnvelope({ value: [{ id: '1' }] })).toBe(false);
  });

  // Keying on property names rather than on message: 'OK!' caught all three of these.
  it('does not mistake a resource that happens to carry an envelope-ish key', () => {
    expect(
      isTransportEnvelope({
        id: '1',
        name: 'a.pdf',
        contentType: 'application/pdf',
        contentBytes: 'AAA',
      })
    ).toBe(false);
    expect(isTransportEnvelope({ message: 'hello', createdDateTime: 'x' })).toBe(false);
    expect(isTransportEnvelope({ success: false, diagnosticData: 'x' })).toBe(false);
  });
});

describe('anyFieldPresent', () => {
  it('is true when a requested field is on the resource', () => {
    expect(anyFieldPresent({ id: '1', subject: 'a' }, ['subject'])).toBe(true);
  });

  it('is true when a requested field is on any collection item', () => {
    expect(anyFieldPresent({ value: [{ id: '1' }, { id: '2', subject: 'a' }] }, ['subject'])).toBe(
      true
    );
  });

  // joinUrl is the event facet's name; the meeting property is joinWebUrl. Without this
  // the typo would silently reduce the response to {id}.
  it('is false when nothing matches, so the caller keeps the full body', () => {
    expect(anyFieldPresent({ id: '1', joinWebUrl: 'u' }, ['joinUrl'])).toBe(false);
  });

  it('treats an empty collection as nothing to lose', () => {
    expect(anyFieldPresent({ value: [] }, ['subject'])).toBe(true);
  });

  // id survives projection regardless, so counting it as a match made this guard inert
  // for exactly the select=id,subject,... shape the llmTips recommend.
  it('ignores always-kept names, so a typo alongside id is still caught', () => {
    expect(anyFieldPresent({ id: '1', joinWebUrl: 'u' }, ['id', 'joinUrl'])).toBe(false);
    expect(anyFieldPresent({ id: '1', joinWebUrl: 'u' }, ['id', 'joinWebUrl'])).toBe(true);
  });

  // select is free text, so the casing is the model's. A capitalised Id used to miss the
  // always-kept filter, match the response's own id, and leave the guard inert.
  it('ignores always-kept names whatever their case', () => {
    expect(anyFieldPresent({ id: '1', joinWebUrl: 'u' }, ['Id', 'joinUrl'])).toBe(false);
    expect(anyFieldPresent({ id: '1', joinWebUrl: 'u' }, ['ID', 'joinWebUrl'])).toBe(true);
  });

  it('allows a select that asks only for always-kept fields', () => {
    expect(anyFieldPresent({ id: '1', subject: 'a' }, ['id'])).toBe(true);
  });
});

describe('projectSelectedFields', () => {
  it('narrows a single resource to the requested fields', () => {
    expect(projectSelectedFields({ id: '1', subject: 'a', body: 'huge' }, ['subject'])).toEqual({
      id: '1',
      subject: 'a',
    });
  });

  // Graph returns id whether or not it was selected, so dropping it here would take away
  // a field callers get today.
  it('keeps id even when it was not selected', () => {
    expect(projectSelectedFields({ id: '1', subject: 'a' }, ['subject'])).toHaveProperty('id', '1');
  });

  // GraphClient strips every @odata.* except nextLink and deltaLink before this runs, so
  // those two and the underscore keys are the annotations that actually reach projection.
  it('keeps @odata.nextLink and @odata.deltaLink', () => {
    const out = projectSelectedFields(
      { '@odata.nextLink': 'n', '@odata.deltaLink': 'd', value: [{ id: '1', subject: 'a' }] },
      ['subject']
    );
    expect(out).toMatchObject({ '@odata.nextLink': 'n', '@odata.deltaLink': 'd' });
  });

  it('keeps the _etag that includeHeaders adds to a single resource', () => {
    expect(
      projectSelectedFields({ id: '1', subject: 'a', _etag: 'W/"1"', body: 'x' }, ['subject'])
    ).toEqual({ id: '1', subject: 'a', _etag: 'W/"1"' });
  });

  it('keeps delta tombstones intact', () => {
    const out = projectSelectedFields({ value: [{ id: '1', '@removed': { reason: 'deleted' } }] }, [
      'subject',
    ]);
    expect((out as { value: any[] }).value[0]).toEqual({
      id: '1',
      '@removed': { reason: 'deleted' },
    });
  });

  it('projects collection items and leaves the envelope intact', () => {
    const out = projectSelectedFields(
      {
        '@odata.count': 2,
        '@odata.nextLink': 'https://graph/next',
        value: [
          { id: '1', subject: 'a', body: 'huge' },
          { id: '2', subject: 'b', body: 'huge' },
        ],
      },
      ['subject']
    );
    expect(out).toEqual({
      '@odata.count': 2,
      '@odata.nextLink': 'https://graph/next',
      value: [
        { id: '1', subject: 'a' },
        { id: '2', subject: 'b' },
      ],
    });
  });

  it('matches property names case-insensitively', () => {
    expect(projectSelectedFields({ id: '1', joinWebUrl: 'u', body: 'x' }, ['joinweburl'])).toEqual({
      id: '1',
      joinWebUrl: 'u',
    });
  });

  it('projects a bare array', () => {
    expect(projectSelectedFields([{ id: '1', a: 1, b: 2 }], ['a'])).toEqual([{ id: '1', a: 1 }]);
  });

  it('is a no-op when nothing was selected', () => {
    const body = { id: '1', subject: 'a', body: 'huge' };
    expect(projectSelectedFields(body, [])).toBe(body);
  });

  it('passes through values that are not objects', () => {
    expect(projectSelectedFields('plain text', ['id'])).toBe('plain text');
    expect(projectSelectedFields(null, ['id'])).toBe(null);
    expect(projectSelectedFields(42, ['id'])).toBe(42);
  });

  // The shape from #660: the caller asked for three fields and Graph sent the whole
  // onlineMeeting, invite HTML and passcode included.
  it('drops joinInformation and the passcode from an onlineMeeting lookup', () => {
    const out = projectSelectedFields(
      {
        value: [
          {
            id: 'MSo',
            subject: 'Standup',
            joinWebUrl: 'https://teams/x',
            joinInformation: { contentType: 'html', content: '<div>...</div>' },
            joinMeetingIdSettings: { isPasscodeRequired: true, passcode: '123456' },
          },
        ],
      },
      ['id', 'subject', 'joinWebUrl']
    );
    const item = (out as { value: Record<string, unknown>[] }).value[0];
    expect(item).toEqual({ id: 'MSo', subject: 'Standup', joinWebUrl: 'https://teams/x' });
  });
});
