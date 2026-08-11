import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { LoginDto } from './dto/login.dto';

export interface LoginResult {
  success: true;
  message: string;
  data: {
    accessToken: string;
    user: {
      id: number;
      fullName: string;
      email: string;
    };
  };
}

/** Authenticates users and issues access tokens. */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /** Validates credentials and returns a JWT-backed authenticated session. */
  async login(loginDto: LoginDto): Promise<LoginResult> {
    try {
      const normalizedEmail = loginDto.email.trim().toLowerCase();
      const user = await this.userRepository
        .createQueryBuilder('user')
        .where('LOWER(TRIM(user.email)) = :email', {
          email: normalizedEmail,
        })
        .getOne();

      if (!user) {
        throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
      }

      const passwordMatches = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      if (!passwordMatches) {
        throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
      }

      const accessToken = await this.jwtService.signAsync({
        sub: user.userId,
        email: user.email,
      });

      return {
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          accessToken,
          user: {
            id: user.userId,
            fullName: user.fullName,
            email: user.email,
          },
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException();
    }
  }
}
