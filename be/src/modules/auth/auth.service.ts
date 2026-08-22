import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { randomUUID } from 'crypto';
import { DataSource, QueryFailedError } from 'typeorm';
import { User } from '../user/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface AuthenticatedUser {
  id: number;
  fullName: string;
  email: string;
}

export interface AuthResponse {
  success: true;
  message: string;
  data: {
    accessToken: string;
    user: AuthenticatedUser;
  };
}

/** Handles authentication business rules and persistence. */
@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  /** Verifies normalized credentials and issues a signed access token. */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const email = loginDto.email.trim().toLowerCase();

    try {
      const user = await this.dataSource
        .getRepository(User)
        .createQueryBuilder('user')
        .where('LOWER(TRIM(user.email)) = :email', { email })
        .getOne();

      if (!user || !(await compare(loginDto.password, user.password))) {
        throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
      }

      const authenticatedUser: AuthenticatedUser = {
        id: user.userId,
        fullName: user.fullName,
        email: user.email,
      };
      const accessToken = await this.jwtService.signAsync({
        sub: user.userId,
        email: user.email,
      });

      return {
        success: true,
        message: 'Đăng nhập thành công',
        data: { accessToken, user: authenticatedUser },
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  /** Creates exactly one normalized user and issues its JWT atomically. */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const fullName = registerDto.fullName.normalize('NFC').trim();
    const email = registerDto.email.trim().toLowerCase();

    if (registerDto.password !== registerDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const existingUser = await manager
          .getRepository(User)
          .createQueryBuilder('user')
          .where('LOWER(TRIM(user.email)) = :email', { email })
          .getOne();

        if (existingUser) {
          throw new ConflictException('This email is already registered');
        }

        const passwordHash = await hash(registerDto.password, 10);
        const username = this.createUniqueUsername(email);
        const user = manager.getRepository(User).create({
          fullName,
          email,
          username,
          password: passwordHash,
          totalBalance: 0,
        });
        const createdUser = await manager.getRepository(User).save(user);
        const registeredUser: AuthenticatedUser = {
          id: createdUser.userId,
          fullName: createdUser.fullName,
          email: createdUser.email,
        };
        const accessToken = await this.jwtService.signAsync({
          sub: createdUser.userId,
          email: createdUser.email,
        });

        return {
          success: true,
          message: 'Registration successful',
          data: { accessToken, user: registeredUser },
        };
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (this.isDuplicateEntry(error)) {
        throw new ConflictException('This email is already registered');
      }

      throw new InternalServerErrorException(
        'Registration failed. Please try again.',
      );
    }
  }

  /** Builds a collision-resistant username from the email prefix. */
  private createUniqueUsername(email: string): string {
    const emailPrefix = email.split('@')[0];
    const normalizedPrefix = emailPrefix
      .normalize('NFKD')
      .replace(/[^A-Za-z0-9_-]/g, '')
      .slice(0, 220);
    const base = normalizedPrefix || 'user';
    return `${base}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }

  /** Detects MySQL unique-constraint failures without exposing driver details. */
  private isDuplicateEntry(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as { code?: string; errno?: number };
    return driverError.code === 'ER_DUP_ENTRY' || driverError.errno === 1062;
  }
}
