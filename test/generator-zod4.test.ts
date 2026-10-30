import { describe, it, expect } from 'vitest';
// @ts-expect-error - generator module is plain JS with no type declarations
import { toZod4 } from '../bin/modules/generate-mcp-tools.mjs';

// openapi-zod-client emits zod 3 code; the generator rewrites what zod 4 rejects or reads differently.

describe('toZod4', () => {
  it('makes strict and passthrough objects loose', () => {
    expect(toZod4('z.object({ a: z.string() }).strict()')).toBe(
      'z.object({ a: z.string() }).loose()'
    );
    expect(toZod4('z.object({}).partial().passthrough()')).toBe('z.object({}).partial().loose()');
  });

  it('gives one-argument records a string key', () => {
    expect(toZod4('z.record(z.object({}).partial().passthrough())')).toBe(
      'z.record(z.string(), z.object({}).partial().loose())'
    );
  });

  it('leaves records that already have a key alone', () => {
    expect(toZod4('z.record(z.string(), z.number())')).toBe('z.record(z.string(), z.number())');
  });

  it('accepts Microsoft GUIDs that are not RFC 9562 UUIDs', async () => {
    const { z } = await import('zod');
    const code = toZod4('z.string().uuid()');
    expect(code).toBe('z.string().guid()');
    // Variant nibble 0 - fine for Graph, rejected by zod 4's .uuid()
    const id = '00000000-0000-0000-0000-000000000001';
    expect(z.string().uuid().safeParse(id).success).toBe(false);
    expect(z.string().guid().safeParse(id).success).toBe(true);
  });

  // zod 4 applies a default inside an optional field, zod 3 did not
  it('keeps omitted fields omitted instead of applying their default', async () => {
    const { z } = await import('zod');
    const code = toZod4('z.boolean().nullable().default(false)');
    expect(code).toBe('z.boolean().nullable().meta({ default: false })');
    const body = z
      .object({ SaveToSentItems: z.boolean().nullable().meta({ default: false }) })
      .partial();
    expect(body.parse({})).toEqual({});
    expect(z.toJSONSchema(body).properties?.SaveToSentItems).toMatchObject({ default: false });
  });

  it('fails rather than leave a default it could not rewrite', () => {
    expect(() => toZod4("z.string().default(String('x'))")).toThrow(/could not rewrite/);
  });
});
