import type { Request } from 'express';

type RequestWithId = Request & {
  id?: unknown;
};

export interface RequestLogProps {
  requestId: string | null;
}

export function requestLogProps(req: Request): RequestLogProps {
  const request = req as RequestWithId;
  const requestId = typeof request.id === 'string' && request.id.length > 0 ? request.id : null;

  // pino-http binds customProps before tenant middleware and reads them again at response finish.
  // Keep these props stable so tenant routes do not serialize duplicate tenantId keys.
  return { requestId };
}
