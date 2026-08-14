import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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

export type RegisterResult = LoginResult;

interface DatabaseError {
  code?: string;
  errno?: number;
}

/** Authenticates users and issues access tokens. */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /** Enforces BR-REG-01 through BR-REG-11 and creates a registered session. */
  async register(registerDto: RegisterDto): Promise<RegisterResult> {
    const fullName = registerDto.fullName.normalize('NFC').trim();
    const email = registerDto.email.trim().toLowerCase();

    if (registerDto.password !== registerDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    try {
      return await this.userRepository.manager.transaction(
        'READ COMMITTED',
        async (manager) => {
          const repository = manager.getRepository(User);
          const existingUser = await repository
            .createQueryBuilder('user')
            .where('LOWER(TRIM(user.email)) = :email', { email })
            .getOne();

          if (existingUser) {
            throw new ConflictException('This email is already registered.');
          }

          const passwordHash = await bcrypt.hash(registerDto.password, 10);
          const username = this.createUniqueUsername(email);
          const user = repository.create({
            fullName,
            email,
            username,
            password: passwordHash,
            totalBalance: 0,
          });
          const savedUser = await repository.save(user);
          const accessToken = await this.jwtService.signAsync({
            sub: savedUser.userId,
            email: savedUser.email,
          });

          if (!savedUser.userId || !accessToken) {
            throw new InternalServerErrorException();
          }

          return {
            success: true,
            message: 'Registration successful',
            data: {
              accessToken,
              user: {
                id: savedUser.userId,
                fullName: savedUser.fullName,
                email: savedUser.email,
              },
            },
          };
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (this.isDuplicateEntryError(error)) {
        throw new ConflictException('This email is already registered.');
      }

      throw new InternalServerErrorException();
    }
  }

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

  /** Generates a stable unique username from the normalized email prefix. */
  private createUniqueUsername(email: string): string {
    const prefix = email.split('@')[0].slice(0, 200) || 'user';
    const suffix = createHash('sha256').update(email).digest('hex').slice(0, 12);

    return `${prefix}-${suffix}`;
  }

  /** Identifies a database unique-constraint violation without exposing details. */
  private isDuplicateEntryError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as DatabaseError;
    return driverError.code === 'ER_DUP_ENTRY' || driverError.errno === 1062;
  }
}
