import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { describeToolSchema } from '../src/lib/tool-schema-describer.js';
import type { Endpoint } from '../src/generated/endpoint-types.js';

const commonTool: Endpoint = {
  alias: 'users.GetUser',
  method: 'get',
  path: '/users/{user-id}',
  description: 'Get a user.',
  requestFormat: 'json',
  parameters: [
    {
      name: 'user-id',
      type: 'Path',
      schema: z.string(),
      description: 'User identifier.',
    },
    {
      name: '$select',
      type: 'Query',
      schema: z.string().optional(),
      description: 'Properties to return.',
    },
  ],
  response: z.unknown(),
};

const postTool: Endpoint = {
  alias: 'me.messages.CreateReply',
  method: 'post',
  path: '/me/messages/{message-id}/createReply',
  description: 'Create a reply draft.',
  requestFormat: 'json',
  parameters: [
    {
      name: 'message-id',
      type: 'Path',
      schema: z.string(),
    },
    {
      name: 'body',
      type: 'Body',
      schema: z.object({ comment: z.string() }),
    },
  ],
  response: z.unknown(),
};

describe('describeToolSchema', () => {
  it('returns name, method, path, and parameters for a common tool', () => {
    const s = describeToolSchema(commonTool, undefined);
    expect(s.name).toBe('users.GetUser');
    expect(s.method).toBe('GET');
    expect(s.path).toBe('/users/{user-id}');
    expect(s.parameters).toHaveLength(2);
  });

  it('marks path parameters as required', () => {
    const s = describeToolSchema(commonTool, undefined);
    const pathParams = s.parameters.filter((p) => p.in === 'Path');
    expect(pathParams).toHaveLength(1);
    expect(pathParams[0]).toMatchObject({ name: 'user-id', required: true });
  });

  it('marks optional non-path parameters as optional', () => {
    const s = describeToolSchema(commonTool, undefined);
    expect(s.parameters.find((p) => p.name === '$select')).toMatchObject({
      required: false,
    });
  });

  it('emits JSON Schema objects (not Zod) for every parameter', () => {
    const s = describeToolSchema(postTool, undefined);
    expect(s.parameters.length).toBeGreaterThan(0);
    for (const p of s.parameters) {
      expect(p.schema).toBeDefined();
      expect(typeof p.schema).toBe('object');
      expect(p.schema).toHaveProperty('type');
    }
  });

  it('includes llmTip when provided', () => {
    const s = describeToolSchema(commonTool, 'Use $select to limit payload size.');
    expect(s.llmTip).toBe('Use $select to limit payload size.');
  });
});
