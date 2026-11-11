import { describe, it, expect, vi } from 'vitest';
// @ts-expect-error - generator module is plain JS with no type declarations
import { applyExtraQueryParams } from '../bin/modules/simplified-openapi.mjs';

const endpoint = {
  toolName: 'get-onenote-page-content',
  extraQueryParams: {
    includeIDs: { type: 'boolean', description: 'Add generated ids.' },
  },
};

describe('applyExtraQueryParams', () => {
  it('leaves an operation alone when the endpoint declares none', () => {
    const parameters = [{ name: '$top', in: 'query', schema: { type: 'integer' } }];
    expect(applyExtraQueryParams(parameters, { toolName: 'x' })).toBe(parameters);
    expect(applyExtraQueryParams(undefined, { toolName: 'x' })).toBeUndefined();
  });

  it('adds each one as an optional query param, with the description on the param', () => {
    expect(applyExtraQueryParams(undefined, endpoint)).toEqual([
      {
        name: 'includeIDs',
        in: 'query',
        required: false,
        description: 'Add generated ids.',
        schema: { type: 'boolean' },
      },
    ]);
  });

  it('keeps the params the spec already has', () => {
    const top = { name: '$top', in: 'query', schema: { type: 'integer' } };
    const page = { name: 'onenotePage-id', in: 'path', required: true, schema: { type: 'string' } };
    const result = applyExtraQueryParams([top, page], endpoint);
    expect(result.slice(0, 2)).toEqual([top, page]);
    expect(result.map((p: { name: string }) => p.name)).toEqual([
      '$top',
      'onenotePage-id',
      'includeIDs',
    ]);
  });

  // The spec is downloaded fresh on every build, so the day Microsoft publishes the
  // param the build has to keep working, with one param rather than two
  it('replaces a same-named query param from the spec, and says so', () => {
    const warn = vi.fn();
    const upstream = { name: 'IncludeIds', in: 'query', schema: { type: 'string' } };
    const header = { name: 'includeIDs', in: 'header', schema: { type: 'string' } };
    const result = applyExtraQueryParams([upstream, header], endpoint, warn);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(header);
    expect(result[1]).toMatchObject({ name: 'includeIDs', schema: { type: 'boolean' } });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain('get-onenote-page-content');
  });
});
