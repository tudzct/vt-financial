import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

/** Protects endpoints with the configured bearer JWT strategy. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /** Returns the API contract's stable authentication failure message. */
  handleRequest<TUser = unknown>(
    error: unknown,
    user: TUser | false | null,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (error || !user) {
      const request = context.switchToHttp().getRequest<Request>();

      if (request.path === '/api/v1/savings/summary') {
        throw new UnauthorizedException(
          'Không thể xác thực người dùng. Vui lòng đăng nhập lại.',
        );
      }

      if (/^\/api\/v1\/accounts\/[^/]+$/.test(request.path)) {
        throw new UnauthorizedException(
          'Unable to authenticate the user. Please log in again.',
        );
      }

      if (error) {
        throw error;
      }

      throw new UnauthorizedException();
    }

    return user;
  }
}
