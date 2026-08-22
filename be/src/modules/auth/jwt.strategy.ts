import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';

interface JwtPayload {
  sub: number;
  email: string;
}

export interface AuthenticatedRequestUser {
  userId: number;
  email: string;
}

/** Validates Bearer JWTs and resolves their subject to an existing user. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /** Returns the normalized authenticated principal for protected controllers. */
  async validate(payload: JwtPayload): Promise<AuthenticatedRequestUser> {
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
