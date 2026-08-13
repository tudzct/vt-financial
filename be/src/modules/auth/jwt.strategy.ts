import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';

interface JwtPayload {
  sub: number;
  email?: string;
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
}

/** Validates access tokens and maps JWT sub to Users.user_id. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
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

  /** Confirms the token still resolves to a persisted user. */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!Number.isInteger(payload.sub) || payload.sub <= 0) {
      throw new UnauthorizedException('Unauthorized');
    }

    const user = await this.userRepository.findOne({
      select: { userId: true, email: true },
      where: { userId: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return { userId: user.userId, email: user.email };
  }
}
