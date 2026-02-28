import { api } from '../src/generated/client.js';
import { z } from 'zod';

describe('Generated tool body schemas', () => {
  for (const endpoint of api.endpoints) {
    const bodyParam = endpoint.parameters?.find((p) => p.type === 'Body');
    if (bodyParam && 'safeParse' in bodyParam.schema) {
      const schema = bodyParam.schema as z.ZodTypeAny;
      const typeName = (schema as any)?._def?.typeName;
      const isObjectSchema = typeName === 'ZodObject' || typeName === 'ZodRecord';
      if (!isObjectSchema) {
        continue;
      }

      it(`${endpoint.alias} should accept additional properties in body`, () => {
        const sample: Record<string, unknown> = { unexpected: 123 };
        const result = schema.safeParse(sample);
        expect(result.success).toBe(true);
      });
    }
  }
});
