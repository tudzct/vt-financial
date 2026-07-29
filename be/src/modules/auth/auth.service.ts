import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { isEmail } from 'class-validator';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';

const FULL_NAME_PATTERN = /^[\p{L}]+(?: [\p{L}]+)*$/u;
const PASSWORD_ALLOWED_PATTERN = /^[A-Za-z0-9!@#$%^&*(){}_=+[\],./<>?\\|:;-]+$/;
const PASSWORD_SPECIAL_PATTERN = /[!@#$%^&*(){}\-_+=[\],./<>?\\|:;]/;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  isRegistrationInputValid(dto: RegisterDto): boolean {
    return this.getRegistrationValidationErrors(dto).length === 0;
  }

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const validationErrors = this.getRegistrationValidationErrors(dto);
    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors);
    }

    const normalizedFullName = dto.fullName.normalize('NFC').trim();
    const normalizedEmail = dto.email.trim().toLowerCase();

    try {
      const existingUser = await this.findByNormalizedEmail(normalizedEmail);

      if (existingUser) {
        throw new ConflictException('This email is already registered.');
      }

      const passwordHash = await bcrypt.hash(dto.password, 10);

      return await this.userRepository.manager.transaction(async (manager) => {
        const transactionalRepository = manager.getRepository(User);
        const username = await this.createUniqueUsername(
          normalizedEmail,
          transactionalRepository,
        );

        const user = transactionalRepository.create({
          fullName: normalizedFullName,
          email: normalizedEmail,
          username,
          password: passwordHash,
          totalBalance: 0,
        });
        const savedUser = await transactionalRepository.save(user);

        const accessToken = await this.jwtService.signAsync({
          sub: savedUser.userId,
          email: savedUser.email,
        });

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
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (this.isDuplicateKeyError(error)) {
        const duplicateEmail =
          await this.findByNormalizedEmail(normalizedEmail);
        if (duplicateEmail) {
          throw new ConflictException('This email is already registered.');
        }
      }

      throw new InternalServerErrorException(
        'Unable to create user or access token.',
      );
    }
  }

  private getRegistrationValidationErrors(dto: RegisterDto): string[] {
    const errors: string[] = [];
    const fullName = typeof dto?.fullName === 'string' ? dto.fullName : null;
    const email = typeof dto?.email === 'string' ? dto.email : null;
    const password = typeof dto?.password === 'string' ? dto.password : null;
    const confirmPassword =
      typeof dto?.confirmPassword === 'string' ? dto.confirmPassword : null;

    if (fullName === null) {
      errors.push('fullName is required');
    } else {
      const normalizedFullName = fullName.normalize('NFC').trim();
      if (
        Array.from(normalizedFullName).length < 4 ||
        Array.from(normalizedFullName).length > 25
      ) {
        errors.push('fullName must be between 4 and 25 characters');
      }
      if (!FULL_NAME_PATTERN.test(normalizedFullName)) {
        errors.push(
          'fullName may contain only Unicode letters separated by single spaces',
        );
      }
    }

    if (email === null) {
      errors.push('email is required');
    } else {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail.length === 0) {
        errors.push('email must not be empty');
      }
      if (normalizedEmail.length > 255) {
        errors.push('email must not exceed 255 characters');
      }
      if (!isEmail(normalizedEmail)) {
        errors.push('email must be a valid email address');
      }
    }

    if (password === null) {
      errors.push('password is required');
    } else {
      if (password.length < 8 || password.length > 64) {
        errors.push('password must be between 8 and 64 characters');
      }
      if (/\s/.test(password)) {
        errors.push('password must not contain whitespace');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('password must contain at least one lowercase letter');
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('password must contain at least one uppercase letter');
      }
      if (!/[0-9]/.test(password)) {
        errors.push('password must contain at least one digit');
      }
      if (!PASSWORD_SPECIAL_PATTERN.test(password)) {
        errors.push(
          'password must contain at least one permitted special character',
        );
      }
      if (!PASSWORD_ALLOWED_PATTERN.test(password)) {
        errors.push('password contains a character that is not permitted');
      }

      if (email !== null) {
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPassword = password.toLowerCase();
        const emailLocalPart = normalizedEmail.split('@')[0];

        if (normalizedPassword === normalizedEmail) {
          errors.push('password must not equal the email address');
        }
        if (normalizedPassword === emailLocalPart) {
          errors.push('password must not equal the email local part');
        }
      }
    }

    if (confirmPassword === null || confirmPassword.length === 0) {
      errors.push('confirmPassword is required');
    } else if (password !== null && confirmPassword !== password) {
      errors.push('confirmPassword must exactly match password');
    }

    return errors;
  }

  private async createUniqueUsername(
    normalizedEmail: string,
    repository: Repository<User>,
  ): Promise<string> {
    const baseUsername = normalizedEmail.split('@')[0];
    let username = baseUsername;
    let suffix = 1;

    while (await repository.exists({ where: { username } })) {
      username = `${baseUsername}${suffix}`;
      suffix += 1;
    }

    return username;
  }

  private findByNormalizedEmail(normalizedEmail: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(TRIM(user.email)) = :email', { email: normalizedEmail })
      .getOne();
  }

  private isDuplicateKeyError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as {
      code?: string;
      errno?: number;
    };
    return driverError.code === 'ER_DUP_ENTRY' || driverError.errno === 1062;
  }
}
