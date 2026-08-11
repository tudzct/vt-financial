import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponse {
  message?: string | string[];
}

/** Converts server errors to the project-wide API error envelope. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = this.getMessage(exceptionResponse);

    response.status(status).json({
      success: false,
      message,
    });
  }

  /** Extracts a safe public message without logging request data. */
  private getMessage(response: string | object | undefined): string | string[] {
    if (typeof response === 'string') {
      return response;
    }

    if (response && 'message' in response) {
      return (response as ErrorResponse).message ?? 'Bad Request';
    }

    return 'Internal Server Error';
  }
}
