import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';

vi.mock('fs', () => {
  return {
    default: { readFileSync: vi.fn().mockReturnValue('mock yaml content') },
    readFileSync: vi.fn().mockReturnValue('mock yaml content'),
  };
});

vi.mock('js-yaml', () => {
  const mockSpec = {
    paths: {
      '/test/path': {
        get: {
          parameters: [
            { name: 'filter', in: 'query', required: false, schema: { type: 'string' } },
          ],
        },
      },
      '/test/{param}/path': {
        get: {
          parameters: [
            { name: 'filter', in: 'query', required: false, schema: { type: 'string' } },
          ],
        },
      },
      '/excel/test': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
  };

  return {
    default: { load: vi.fn().mockReturnValue(mockSpec) },
    load: vi.fn().mockReturnValue(mockSpec),
  };
});

vi.mock('../src/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock param-mapper module
vi.mock('../src/param-mapper.mjs', () => ({
  createFriendlyParamName: (name) => (name.startsWith('$') ? name.substring(1) : name),
  registerParamMapping: vi.fn(),
  getOriginalParamName: vi.fn(),
}));

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { mapToZodType, buildRequestUrl } from '../src/openapi-helpers.mjs';

function mockProcessParameter(parameter) {
  const schema = parameter.schema?.type === 'string' ? z.string() : z.any();
  return parameter.required ? schema : schema.optional();
}

describe('OpenAPI Helpers', () => {
  describe('mapToZodType', () => {
    it('should map string schema to z.string()', () => {
      const schema = { type: 'string' };
      const result = mapToZodType(schema);

      expect(result).toBeInstanceOf(z.ZodString);
    });

    it('should map number schema to z.number()', () => {
      const schema = { type: 'number' };
      const result = mapToZodType(schema);

      expect(result).toBeInstanceOf(z.ZodNumber);
    });

    it('should map integer schema to z.number()', () => {
      const schema = { type: 'integer' };
      const result = mapToZodType(schema);

      expect(result).toBeInstanceOf(z.ZodNumber);
    });

    it('should map boolean schema to z.boolean()', () => {
      const schema = { type: 'boolean' };
      const result = mapToZodType(schema);

      expect(result).toBeInstanceOf(z.ZodBoolean);
    });

    it('should map array schema to z.array()', () => {
      const schema = { type: 'array', items: { type: 'string' } };
      const result = mapToZodType(schema);

      expect(result).toBeInstanceOf(z.ZodArray);
    });

    it('should map object schema to z.object()', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
      };
      const result = mapToZodType(schema);

      expect(result).toBeInstanceOf(z.ZodObject);
    });

    it('should handle $ref schema', () => {
      const schema = { $ref: '#/components/schemas/StringType' };
      const result = mapToZodType(schema);

      expect(result).toBeInstanceOf(z.ZodString);
    });
  });

  describe('buildRequestUrl', () => {
    it('should build a URL without parameters', () => {
      const baseUrl = '/test/path';
      const params = {};
      const pathParams = [];
      const queryParamDefs = [];

      const result = buildRequestUrl(baseUrl, params, pathParams, queryParamDefs);

      expect(result).toBe('/test/path');
    });

    it('should replace path parameters', () => {
      const baseUrl = '/test/{id}/path';
      const params = { id: '123' };
      const pathParams = ['{id}'];
      const queryParamDefs = [];

      const result = buildRequestUrl(baseUrl, params, pathParams, queryParamDefs);

      expect(result).toBe('/test/123/path');
    });

    it('should add query parameters', () => {
      const baseUrl = '/test/path';
      const params = { filter: 'test' };
      const pathParams = [];
      const queryParamDefs = [{ name: 'filter', in: 'query' }];

      const result = buildRequestUrl(baseUrl, params, pathParams, queryParamDefs);

      expect(result).toBe('/test/path?filter=test');
    });

    it('should handle Excel range addresses', () => {
      const baseUrl = "/workbook/worksheets/{id}/range(address='{address}')";
      const params = { id: 'Sheet1', address: 'A1:C10' };
      const pathParams = ['{id}'];
      const queryParamDefs = [];

      const result = buildRequestUrl(baseUrl, params, pathParams, queryParamDefs);

      expect(result).toBe("/workbook/worksheets/Sheet1/range(address='A1%3AC10')");
    });

    it('should handle array parameters', () => {
      const baseUrl = '/test/path';
      const params = { select: ['name', 'email'] };
      const pathParams = [];
      const queryParamDefs = [{ name: '$select', in: 'query' }];
      const toolName = 'test-tool';

      const result = buildRequestUrl(baseUrl, params, pathParams, queryParamDefs);

      expect(result).toBe('/test/path?$select=name,email');
    });

    it('should map friendly parameter names to original names with $ prefix', () => {
      const baseUrl = '/test/path';
      const params = {
        select: 'name,email',
        filter: "contains(displayName, 'test')",
        orderby: 'displayName',
      };
      const pathParams = [];
      const queryParamDefs = [
        { name: '$select', in: 'query' },
        { name: '$filter', in: 'query' },
        { name: '$orderby', in: 'query' },
      ];
      const toolName = 'test-tool';

      const result = buildRequestUrl(baseUrl, params, pathParams, queryParamDefs);

      // URL should contain original parameter names with $ prefix
      expect(result).toContain('$select=');
      expect(result).toContain('$filter=');
      expect(result).toContain('$orderby=');
    });
  });
});
