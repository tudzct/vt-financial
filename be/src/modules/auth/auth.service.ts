import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager } from 'typeorm';
import { User } from '../user/user.entity';
import { RegisterDto } from './dto/register.dto';

interface NormalizedRegisterDto {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisteredUserDto {
  id: number;
  fullName: string;
  email: string;
}

export interface RegisterResponseDto {
  success: true;
  message: string;
  data: {
    accessToken: string;
    user: RegisteredUserDto;
  };
}

/** Enforces the UC-01 registration invariants and creates the authenticated user. */
@Injectable()
export class AuthService {
  private static readonly bcryptRounds = 10;
  private static readonly passwordPattern = new RegExp(
    '^[A-Za-z0-9!@#$%^&*(){}_=+\\[\\],./<>?\\\\|:;-]+$',
  );
  private static readonly specialCharacterPattern = new RegExp(
    '[!@#$%^&*(){}\\-_=+\\[\\],./<>?\\\\|:;]',
  );

  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const normalizedDto = this.normalize(dto);
    const validationError = this.getRegistrationValidationError(normalizedDto);

    if (validationError) {
      throw new BadRequestException(validationError);
    }

    const user = await this.createUser(normalizedDto);
    const accessToken = await this.jwtService.signAsync({
      sub: user.userId,
      email: user.email,
    });

    return {
      success: true,
      message: 'Registration successful.',
      data: {
        accessToken,
        user: this.toRegisteredUser(user),
      },
    };
  }

  /** Exposes the specification's query operation without leaking sensitive values. */
  isRegistrationInputValid(dto: RegisterDto): boolean {
    return (
      this.getRegistrationValidationError(this.normalize(dto)) === undefined
    );
  }

  private normalize(dto: RegisterDto): NormalizedRegisterDto {
    return {
      fullName: dto.fullName?.normalize('NFC').trim(),
      email: dto.email?.trim().toLowerCase(),
      password: dto.password,
      confirmPassword: dto.confirmPassword,
    };
  }

  private getRegistrationValidationError(
    dto: NormalizedRegisterDto,
  ): string | undefined {
    if (!dto.fullName) {
      return 'Full name is required.';
    }
    if (dto.fullName.length < 4 || dto.fullName.length > 25) {
      return 'Full name must be between 4 and 25 characters.';
    }
    if (!/^\p{L}+(?: \p{L}+)*$/u.test(dto.fullName)) {
      return 'Full name may contain letters separated by single spaces only.';
    }
    if (!dto.email) {
      return 'Email is required.';
    }
    if (dto.email.length > 255 || !this.isEmail(dto.email)) {
      return 'Enter a valid email address.';
    }
    if (!dto.password) {
      return 'Password is required.';
    }
    if (dto.password.length < 8 || dto.password.length > 64) {
      return 'Password must be between 8 and 64 characters.';
    }
    if (/\s/.test(dto.password)) {
      return 'Password must not contain whitespace.';
    }
    if (!/[a-z]/.test(dto.password)) {
      return 'Password must include a lowercase letter.';
    }
    if (!/[A-Z]/.test(dto.password)) {
      return 'Password must include an uppercase letter.';
    }
    if (!/[0-9]/.test(dto.password)) {
      return 'Password must include a digit.';
    }
    if (!AuthService.specialCharacterPattern.test(dto.password)) {
      return 'Password must include a special character.';
    }
    if (!AuthService.passwordPattern.test(dto.password)) {
      return 'Password contains unsupported characters.';
    }
    if (dto.password.toLowerCase() === dto.email) {
      return 'Password must not match your email address.';
    }
    if (dto.password.toLowerCase() === this.getEmailLocalPart(dto.email)) {
      return 'Password must not match the email local part.';
    }
    if (!dto.confirmPassword) {
      return 'Password confirmation is required.';
    }
    if (dto.password !== dto.confirmPassword) {
      return 'Passwords do not match.';
    }

    return undefined;
  }

  private async createUser(dto: NormalizedRegisterDto): Promise<User> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.dataSource.transaction(async (manager) => {
          const userRepository = manager.getRepository(User);
          const existing = await userRepository
            .createQueryBuilder('user')
            .where('LOWER(TRIM(user.email)) = :email', { email: dto.email })
            .getOne();

          if (existing) {
            throw new ConflictException(
              'An account with this email already exists.',
            );
          }

          const username = await this.createUniqueUsername(manager, dto.email);
          const passwordHash = await bcrypt.hash(
            dto.password,
            AuthService.bcryptRounds,
          );

          return userRepository.save(
            userRepository.create({
              fullName: dto.fullName,
              email: dto.email,
              username,
              password: passwordHash,
              phoneNumber: '',
              profilePictureUrl: '',
              totalBalance: 0,
            }),
          );
        });
      } catch (error) {
        if (error instanceof ConflictException) {
          throw new ConflictException(
            'An account with this email already exists.',
          );
        }
        if (this.isMysqlDuplicateError(error)) {
          const emailAlreadyExists = await this.dataSource
            .getRepository(User)
            .createQueryBuilder('user')
            .where('LOWER(TRIM(user.email)) = :email', { email: dto.email })
            .getExists();

          if (emailAlreadyExists) {
            throw new ConflictException(
              'An account with this email already exists.',
            );
          }
          if (attempt < 4) {
            continue;
          }
        }
        throw error;
      }
    }

    throw new InternalServerErrorException('Unable to create the account.');
  }

  private async createUniqueUsername(
    manager: EntityManager,
    email: string,
  ): Promise<string> {
    const base = this.getEmailLocalPart(email).slice(0, 240) || 'user';
    const repository = manager.getRepository(User);

    for (let suffix = 0; suffix < 1000; suffix += 1) {
      const candidate = suffix === 0 ? base : `${base}-${suffix}`;
      const exists = await repository.exists({
        where: { username: candidate },
      });
      if (!exists) {
        return candidate;
      }
    }

    throw new InternalServerErrorException(
      'Unable to generate a unique username.',
    );
  }

  private toRegisteredUser(user: User): RegisteredUserDto {
    return { id: user.userId, fullName: user.fullName, email: user.email };
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private getEmailLocalPart(email: string): string {
    return email.split('@', 1)[0].toLowerCase();
  }

  private isMysqlDuplicateError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    const databaseError = error as {
      code?: string;
      errno?: number;
      driverError?: { code?: string; errno?: number };
    };

    return (
      databaseError.code === 'ER_DUP_ENTRY' ||
      databaseError.errno === 1062 ||
      databaseError.driverError?.code === 'ER_DUP_ENTRY' ||
      databaseError.driverError?.errno === 1062
    );
  }
}
