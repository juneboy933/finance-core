import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export interface RequestWithCorrelationId extends Request {
  correlationId: string;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: RequestWithCorrelationId, res: Response, next: NextFunction) {
    // Reuse client/gateway header if present, otherwise generate a new UUID
    const headerId = req.headers['x-correlation-id'];
    const id =
      (Array.isArray(headerId) ? headerId[0] : headerId) || randomUUID();

    req.correlationId = id;
    res.setHeader('x-correlation-id', id);
    next();
  }
}
