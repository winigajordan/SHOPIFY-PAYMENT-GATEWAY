import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string[] = ['Internal server error'];

    /**
     * Cas HttpException standard
     */
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      /**
       * 1. HttpException("msg", status)
       */
      if (typeof exceptionResponse === 'string') {
        message = [exceptionResponse];
      }

      /**
       * 2. HttpException({ message: "...", ... })
       */
      else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as any;

        // message = string ?
        if (typeof res.message === 'string') {
          message = [res.message];
        }
        // message = array ?
        else if (Array.isArray(res.message)) {
          message = res.message;
        }
      }
    }

    /**
     * Réponse uniforme
     */
    return response.status(status).json({
      success: false,
      message,
      error: {
        statusCode: status,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
