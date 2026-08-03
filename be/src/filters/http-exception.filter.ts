import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorEnvelope {
  success: false;
  message: string | string[];
  error?: unknown;
}

interface NestHttpErrorBody {
  message?: string | string[];
  error?: unknown;
}

const isNestHttpErrorBody = (value: unknown): value is NestHttpErrorBody =>
  typeof value === 'object' && value !== null;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionBody =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const body = isNestHttpErrorBody(exceptionBody) ? exceptionBody : undefined;
    const message =
      body?.message ??
      (typeof exceptionBody === 'string'
        ? exceptionBody
        : status === Number(HttpStatus.INTERNAL_SERVER_ERROR)
          ? 'Internal server error.'
          : 'Request failed.');

    const envelope: ErrorEnvelope = {
      success: false,
      message,
    };

    if (
      body?.error !== undefined &&
      status !== Number(HttpStatus.INTERNAL_SERVER_ERROR)
    ) {
      envelope.error = body.error;
    }

    if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      console.error(`HTTP ${status} ${request.method} ${request.url}`);
    }

    response.status(status).json(envelope);
  }
}
