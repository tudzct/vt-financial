import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'express';

interface HttpErrorPayload {
  message?: string | string[];
  error?: string;
}

/** Converts all thrown errors to the application's standard JSON envelope. */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal Server Error';
    let errorName: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        const payload = exceptionResponse as HttpErrorPayload;
        message = payload.message ?? exception.message;
        if (
          Array.isArray(message) &&
          message.length > 0 &&
          message.every((item) => item === message[0])
        ) {
          message = message[0];
        }
        errorName = payload.error;
      }
    } else {
      // Log unhandled exceptions (Internal Server Errors) to the console
      console.error('Unhandled Exception:', exception);
    }

    const body: {
      success: false;
      message: string | string[];
      error?: string;
    } = { success: false, message };

    if (
      status === HttpStatus.BAD_REQUEST &&
      request.method === 'POST' &&
      request.path === '/api/v1/transactions'
    ) {
      body.message = 'Invalid or missing transaction data';
    }

    if (status === HttpStatus.BAD_REQUEST && errorName) {
      body.error = errorName;
    }

    response.status(status).json(body);
  }
}
