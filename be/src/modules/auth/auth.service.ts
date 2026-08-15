import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { DataSource, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface RegisteredUser {
  id: number;
  fullName: string;
  email: string;
}

export interface RegisterResponse {
  success: true;
  message: string;
  data: {
    accessToken: string;
    user: RegisteredUser;
  };
}

export interface LoginResponse {
  success: true;
  message: string;
  data: {
    accessToken: string;
    user: RegisteredUser;
  };
}

/** Contains the business rules for public account registration. */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  /** Applies BR-LOG-01 through BR-LOG-06 to authenticate an existing user. */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const email = this.normalizeEmail(loginDto.email);
    this.assertLoginInput({ ...loginDto, email });

    try {
      const user = await this.userRepository
        .createQueryBuilder('user')
        .where('LOWER(TRIM(user.email)) = :email', { email })
        .getOne();

      if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
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
          user: this.toRegisteredUser(user),
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  /** Creates a normalized user, hashes its password, and signs a JWT atomically. */
  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    const fullName = this.normalizeName(registerDto.fullName);
    const email = this.normalizeEmail(registerDto.email);

    this.assertRegistrationInput({ ...registerDto, fullName, email });

    try {
      return await this.dataSource.transaction(async (manager) => {
        const existingUser = await manager
          .createQueryBuilder(User, 'user')
          .where('LOWER(TRIM(user.email)) = :email', { email })
          .getOne();

        if (existingUser) {
          throw new ConflictException(
            'Conflict / This email is already registered.',
          );
        }

        const passwordHash = await bcrypt.hash(registerDto.password, 10);
        const user = manager.create(User, {
          fullName,
          email,
          username: this.createUsername(email),
          password: passwordHash,
          totalBalance: 0,
        });
        const createdUser = await manager.save(User, user);
        const accessToken = await this.jwtService.signAsync({
          sub: createdUser.userId,
          email: createdUser.email,
        });

        return {
          success: true,
          message: 'Registration successful',
          data: {
            accessToken,
            user: this.toRegisteredUser(createdUser),
          },
        };
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      if (
        this.isUniqueConstraintError(error) &&
        (await this.emailExists(email))
      ) {
        throw new ConflictException(
          'Conflict / This email is already registered.',
        );
      }

      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  /** Checks BR-REG-01, BR-REG-02, BR-REG-04, BR-REG-05, and BR-REG-06. */
  private assertRegistrationInput(registerDto: RegisterDto): void {
    const { fullName, email, password, confirmPassword } = registerDto;
    const hasValidName =
      typeof fullName === 'string' &&
      fullName.length >= 4 &&
      fullName.length <= 25 &&
      /^\p{L}+(?: \p{L}+)*$/u.test(fullName);
    const hasValidEmail =
      typeof email === 'string' &&
      email.length > 0 &&
      email.length <= 255 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const hasValidPassword =
      typeof password === 'string' &&
      password.length >= 8 &&
      password.length <= 64 &&
      !/\s/.test(password) &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*(){}\-_+=\[\],./<>?\\|:;]/.test(password) &&
      /^[A-Za-z0-9!@#$%^&*(){}_=+\[\],./<>?\\|:;\-]+$/.test(password);

    if (!hasValidName || !hasValidEmail || !hasValidPassword) {
      throw new BadRequestException('Bad Request / Input validation failed.');
    }

    if (typeof confirmPassword !== 'string' || confirmPassword !== password) {
      throw new BadRequestException('Bad Request / Passwords do not match.');
    }
  }

  /** Checks BR-LOG-01 and BR-LOG-02 before performing a user lookup. */
  private assertLoginInput(loginDto: LoginDto): void {
    const { email, password } = loginDto;
    const hasValidEmail =
      typeof email === 'string' &&
      email.length > 0 &&
      email.length <= 255 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const hasValidPassword =
      typeof password === 'string' && password.length > 0;

    if (!hasValidEmail || !hasValidPassword) {
      throw new BadRequestException('Bad Request / Input validation failed.');
    }
  }

  /** Applies the BR-REG-01 canonical form before persistence and comparison. */
  private normalizeName(value: unknown): string {
    return typeof value === 'string' ? value.normalize('NFC').trim() : '';
  }

  /** Applies the BR-REG-02 canonical form before persistence and comparison. */
  private normalizeEmail(value: unknown): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
  }

  /** Derives a collision-resistant unique username from the normalized email prefix. */
  private createUsername(email: string): string {
    const emailPrefix = email.split('@')[0].replace(/[^a-z0-9]/g, '-');
    const base = emailPrefix.replace(/^-+|-+$/g, '') || 'user';
    const suffix = randomUUID();
    return `${base.slice(0, 255 - suffix.length - 1)}-${suffix}`;
  }

  /** Returns the response-safe user representation without sensitive columns. */
  private toRegisteredUser(user: User): RegisteredUser {
    return {
      id: user.userId,
      fullName: user.fullName,
      email: user.email,
    };
  }

  /** Rechecks normalized email ownership after a duplicate-key race. */
  private async emailExists(email: string): Promise<boolean> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(TRIM(user.email)) = :email', { email })
      .getOne();
    return Boolean(user);
  }

  /** Identifies database duplicate-key failures without exposing driver details. */
  private isUniqueConstraintError(error: unknown): boolean {
    const databaseError = error as
      | { code?: string; errno?: number }
      | undefined;
    return (
      databaseError?.code === 'ER_DUP_ENTRY' || databaseError?.errno === 1062
    );
  }
}
