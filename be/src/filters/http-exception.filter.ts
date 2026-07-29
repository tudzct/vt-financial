import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorDetails {
  message?: string;
  field?: string;
  action?: string;
  code?: string;
}

/** Converts all API failures to the application's documented response envelope. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const details = this.getDetails(exceptionResponse);
    const isRegistration = request.path.endsWith('/auth/register');
    const duplicateEmail = isRegistration && this.isDuplicateEmailError(exception);
    if (duplicateEmail) status = HttpStatus.CONFLICT;
    const message = duplicateEmail
      ? 'An account with this email already exists.'
      : details.message;
    const field = duplicateEmail
      ? 'email'
      : details.field || (isRegistration ? this.getRegistrationField(message) : undefined);
    const action =
      details.action ||
      (isRegistration
        ? this.getRegistrationAction(status, field)
        : undefined);

    response.status(status).json({
      success: false,
      code: details.code || this.getErrorCode(status),
      field,
      action,
      message:
        message ||
        (status >= 500
          ? 'The service could not complete your request right now.'
          : 'The request could not be completed. Review your input and try again.'),
    });
  }

  private getDetails(
    response: string | object | undefined,
  ): ErrorDetails {
    if (typeof response === 'string') {
      return { message: response };
    }

    if (response) {
      const errorResponse = response as {
        message?: string | string[];
        field?: string;
        action?: string;
        code?: string;
      };
      return {
        message: Array.isArray(errorResponse.message)
          ? errorResponse.message.join(' ')
          : errorResponse.message,
        field: errorResponse.field,
        action: errorResponse.action,
        code: errorResponse.code,
      };
    }

    return {};
  }

  private getRegistrationField(message: string | undefined): string | undefined {
    const normalizedMessage = message?.toLowerCase() || '';
    if (normalizedMessage.includes('email')) return 'email';
    if (normalizedMessage.includes('full name')) return 'fullName';
    if (
      normalizedMessage.includes('confirmation') ||
      normalizedMessage.includes('passwords do not match')
    ) {
      return 'confirmPassword';
    }
    if (normalizedMessage.includes('password')) return 'password';
    return undefined;
  }

  private getRegistrationAction(
    status: number,
    field: string | undefined,
  ): string {
    if (status === HttpStatus.CONFLICT && field === 'email') {
      return 'Use a different email address, or sign in with the existing account.';
    }
    if (status === HttpStatus.BAD_REQUEST || status === HttpStatus.UNPROCESSABLE_ENTITY) {
      const actions: Record<string, string> = {
        fullName: 'Enter a full name containing 4 to 25 letters, separated by single spaces.',
        email: 'Enter a valid email address that has not already been registered.',
        password:
          'Enter 8 to 64 characters with uppercase, lowercase, a number, and a permitted special character; do not use spaces.',
        confirmPassword: 'Enter exactly the same value as the Password field.',
      };
      return field
        ? actions[field] || 'Correct the highlighted field, then submit the form again.'
        : 'Review the highlighted fields, correct the invalid values, then submit the form again.';
    }
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'No registration field was rejected. Keep your current entries, wait a moment, then select Sign up again.';
    }
    return 'Correct the highlighted field, then submit the form again.';
  }

  private isDuplicateEmailError(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') return false;
    const databaseError = exception as {
      code?: string;
      errno?: number;
      message?: string;
      sqlMessage?: string;
      driverError?: {
        code?: string;
        errno?: number;
        message?: string;
        sqlMessage?: string;
      };
    };
    const code = databaseError.code || databaseError.driverError?.code;
    const errno = databaseError.errno || databaseError.driverError?.errno;
    const message = [
      databaseError.message,
      databaseError.sqlMessage,
      databaseError.driverError?.message,
      databaseError.driverError?.sqlMessage,
    ].filter(Boolean).join(' ').toLowerCase();

    return (code === 'ER_DUP_ENTRY' || errno === 1062) && message.includes('email');
  }

  private getErrorCode(status: number): string {
    if (status === HttpStatus.BAD_REQUEST) return 'INVALID_INPUT';
    if (status === HttpStatus.CONFLICT) return 'CONFLICT';
    if (status === HttpStatus.TOO_MANY_REQUESTS) return 'TOO_MANY_ATTEMPTS';
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) return 'SERVICE_ERROR';
    return 'REQUEST_FAILED';
  }
}
