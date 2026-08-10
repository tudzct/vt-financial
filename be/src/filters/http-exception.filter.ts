import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/** Formats every HTTP exception using the application's API response envelope. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = this.getMessage(exceptionResponse, status);

    response.status(status).json({
      success: false,
      message,
    });
  }

  /** Extracts a safe client-facing message without exposing implementation details. */
  private getMessage(response: string | object | undefined, status: number): string | string[] {
    if (typeof response === 'string') {
      return response;
    }

    if (response && 'message' in response) {
      const message = (response as { message?: string | string[] }).message;
      if (message) {
        return message;
      }
    }

    return status === HttpStatus.INTERNAL_SERVER_ERROR
      ? 'Internal Server Error'
      : 'Bad Request';
  }
}
