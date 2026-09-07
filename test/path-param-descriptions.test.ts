import { describe, expect, it } from 'vitest';
import { describePathParam } from '../src/lib/path-params.js';

// Node 18 lacks the File global that the generated Zod schemas reference.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!globalThis.File) (globalThis as any).File = Blob;

const { api } = await import('../src/generated/client.js');

/**
 * Path parameters are injected into the generated client by generated/hack.ts, not by
 * registerGraphTools — so a mock-endpoint test in graph-tools.test.ts does not cover
 * them. Assert against the real client to make sure the description the model actually
 * receives is the informative one.
 */
describe('describePathParam', () => {
  it('names the parameter and steers off the generic `id` key', () => {
    const d = describePathParam('messageId');
    expect(d).toContain("'messageId'");
    expect(d).toContain("not as 'id'");
    expect(d).toContain('message');
  });

  it('splits camelCase resource names into readable words', () => {
    expect(describePathParam('todoTaskListId')).toContain('todo task list');
  });

  // 'address' is an A1 range, 'q' is search text, 'index' selects a position — none are
  // ids fetched beforehand, so the description must not claim a source.
  it.each(['address', 'q', 'index', 'sideIndex'])(
    'makes no provenance claim for non-identifier param %s',
    (name) => {
      const d = describePathParam(name);
      expect(d).toContain(`'${name}'`);
      expect(d).not.toContain('list or get tool');
      expect(d).not.toContain("not as 'id'");
    }
  );
});

describe('generated client path parameters', () => {
  const pathParams = api.endpoints.flatMap((endpoint) =>
    (endpoint.parameters ?? [])
      .filter((p) => p.type === 'Path')
      .map((p) => ({
        alias: endpoint.alias,
        name: p.name,
        // Pre-declared params carry their text on the zod schema rather than alongside it.
        description: p.description ?? p.schema?.description,
      }))
  );

  it('has path parameters to check', () => {
    expect(pathParams.length).toBeGreaterThan(100);
  });

  // Covers both the synthesized `Path parameter: messageId` and the pre-declared
  // kebab-case `Path parameter: drive-id`, which is spelled differently from the name
  // callers actually have to send.
  it('never ships a "Path parameter: …" stub', () => {
    const stubs = pathParams.filter((p) => /^Path parameter: /.test(p.description ?? ''));
    expect(
      stubs.slice(0, 10).map((p) => `${p.alias}.${p.name}`),
      `${stubs.length} path parameter(s) still carry the stub description`
    ).toEqual([]);
  });

  // Asserted against literal text, not against describePathParam's own output — comparing
  // the helper to itself would pass however wrong the helper became.
  it('describes get-mail-message.messageId with the id guidance', () => {
    const p = pathParams.find((x) => x.alias === 'get-mail-message' && x.name === 'messageId');
    expect(p?.description).toBe(
      "Value for the 'messageId' path segment. Pass it under the name 'messageId', not as " +
        "'id'. Use the 'id' field of the message object as returned by Microsoft Graph."
    );
  });

  // get-excel-range.address is an A1 range the caller composes, not an id to look up.
  it('describes get-excel-range.address without inventing a source', () => {
    const p = pathParams.find((x) => x.alias === 'get-excel-range' && x.name === 'address');
    expect(p?.description).toBe("Value for the 'address' path segment.");
  });

  it('describes get-mail-message.messageId usefully', () => {
    const p = pathParams.find((x) => x.alias === 'get-mail-message' && x.name === 'messageId');
    expect(p).toBeDefined();
    expect(p!.description).toContain("not as 'id'");
  });
});
