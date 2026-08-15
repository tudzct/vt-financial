import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** The validated JWT data exposed to protected controllers. */
export interface AuthenticatedJwtUser {
  sub: number;
}

interface JwtPayload {
  sub?: unknown;
}

/** Enforces the JWT authentication rule and exposes only the authenticated user id. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /** Rejects tokens that do not carry a valid positive numeric subject. */
  validate(payload: JwtPayload): AuthenticatedJwtUser {
    if (!Number.isInteger(payload?.sub) || (payload.sub as number) <= 0) {
      throw new UnauthorizedException();
    }

    return { sub: payload.sub as number };
  }
}
