import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  success: false;
  message: string | string[];
  error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = this.toResponseBody(exception, status);

    response.status(status).json({
      ...body,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private toResponseBody(
    exception: unknown,
    status: number,
  ): ErrorResponseBody {
    if (!(exception instanceof HttpException)) {
      return {
        success: false,
        message: 'Internal Server Error',
        error: 'Internal Server Error',
      };
    }

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === 'string') {
      return {
        success: false,
        message: exceptionResponse,
        error: exception.name,
      };
    }

    const responseObject = exceptionResponse as {
      message?: string | string[];
      error?: string;
    };

    return {
      success: false,
      message:
        responseObject.message ??
        (status === 500 ? 'Internal Server Error' : exception.message),
      ...(responseObject.error ? { error: responseObject.error } : {}),
    };
  }
}
