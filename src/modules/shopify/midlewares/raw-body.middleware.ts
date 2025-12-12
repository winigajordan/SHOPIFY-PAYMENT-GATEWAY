// src/shopify/middlewares/raw-body.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.path.includes('/shopify/webhooks')) {

      let rawBody = '';

      req.on('data', (chunk) => {
        rawBody += chunk.toString('utf8');
      });

      req.on('end', () => {
        (req as any).rawBody = rawBody;
        next();
      });
    } else {
      next();
    }
  }
}