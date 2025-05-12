import { z } from 'zod';

// Schema declarations
export const message = z.lazy(() => messageSchema);

// Schema definitions
export const messageSchema = z.object({
    "subject": z.string().optional(),
    "body": z.object({
    "contentType": z.enum(['text', 'html']).optional(),
    "content": z.string().optional()
  }).passthrough().optional(),
    "toRecipients": z.array(z.object({
    "emailAddress": z.object({
    "address": z.string().optional(),
    "name": z.string().optional()
  }).passthrough().optional()
  }).passthrough()).optional()
  }).passthrough();


// Export combined schemas
export const schemas = {
  message,
};
