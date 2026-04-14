import type { z } from 'zod';

export interface McpRegistrationContext {
  multiAccount: boolean;
  accountNames: string[];
}

export interface McpToolRegistration {
  schema: Record<string, z.ZodTypeAny>;
  description: string;
  readOnlyHint?: boolean;
  openWorldHint?: boolean;
}
