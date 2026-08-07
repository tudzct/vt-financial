import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { createHash } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { isEmail } from 'class-validator';
import { User } from '../user/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const bcryptSaltRounds = 10;
const fullNamePattern = /^[\p{L}]+(?: [\p{L}]+)*$/u;
const permittedPasswordPattern =
  /^[A-Za-z0-9!@#$%^&*(){}_=+\[\],./<>?\\|:;\-]+$/;
const passwordSpecialCharacterPattern =
  /[!@#$%^&*(){}\-_+=\[\],./<>?\\|:;]/;

export interface RegisteredUser {
  id: number;
  fullName: string;
  email: string;
}

export interface RegistrationResponse {
  success: true;
  message: 'Registration successful';
  data: {
    accessToken: string;
    user: RegisteredUser;
  };
}

export interface LoginResponse {
  success: true;
  message: 'Login successfully';
  data: {
    accessToken: string;
    user: RegisteredUser;
  };
}

interface DatabaseError {
  code?: string;
  errno?: number;
}

/** Implements authentication business rules and persistence. */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  /** Authenticates valid credentials and returns a signed JWT session. */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const email = this.normalizeEmail(loginDto.email);

    if (!this.isLoginInputValid({ ...loginDto, email })) {
      throw new BadRequestException('Bad Request');
    }

    try {
      const user = await this.userRepository.findOne({
        where: { normalizedEmail: email },
      });
      const passwordMatches = user
        ? await compare(loginDto.password, user.password)
        : false;

      if (!user || !passwordMatches) {
        throw new UnauthorizedException('Email or password is wrong.');
      }

      const accessToken = await this.jwtService.signAsync({
        sub: user.userId,
        email: user.email,
      });
      if (!accessToken) {
        throw new Error('JWT signing returned an empty token');
      }

      return {
        success: true,
        message: 'Login successfully',
        data: {
          accessToken,
          user: {
            id: user.userId,
            fullName: user.fullName,
            email: user.email,
          },
        },
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  /** Creates one normalized user and signs its JWT atomically. */
  async register(registerDto: RegisterDto): Promise<RegistrationResponse> {
    const fullName = this.normalizeFullName(registerDto.fullName);
    const email = this.normalizeEmail(registerDto.email);

    if (registerDto.password !== registerDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    if (!this.isRegistrationInputValid({ ...registerDto, fullName, email })) {
      throw new BadRequestException('Bad Request');
    }

    try {
      if (await this.normalizedEmailExists(this.userRepository, email)) {
        throw new ConflictException('This email is already registered');
      }

      // BR-REG-09: hash before persistence and never expose the hash.
      const passwordHash = await hash(registerDto.password, bcryptSaltRounds);

      return await this.dataSource.transaction(async (manager) => {
        const userRepository = manager.getRepository(User);

        if (await this.normalizedEmailExists(userRepository, email)) {
          throw new ConflictException('This email is already registered');
        }

        const user = userRepository.create({
          fullName,
          email,
          normalizedEmail: email,
          username: this.generateUsername(email),
          password: passwordHash,
          totalBalance: 0,
        });
        const createdUser = await userRepository.save(user);
        const accessToken = await this.jwtService.signAsync({
          sub: createdUser.userId,
          email: createdUser.email,
        });
        if (!accessToken) {
          throw new Error('JWT signing returned an empty token');
        }

        return {
          success: true,
          message: 'Registration successful',
          data: {
            accessToken,
            user: {
              id: createdUser.userId,
              fullName: createdUser.fullName,
              email: createdUser.email,
            },
          },
        };
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) {
        throw error;
      }

      if (this.isUniqueConstraintViolation(error)) {
        const duplicatedEmail = await this.normalizedEmailExists(
          this.userRepository,
          email,
        ).catch(() => false);

        if (duplicatedEmail) {
          throw new ConflictException('This email is already registered');
        }
      }

      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  /** Independently enforces BR-REG-01, 02, 04, 05, and 06. */
  isRegistrationInputValid(registerDto: RegisterDto): boolean {
    if (
      typeof registerDto.fullName !== 'string' ||
      typeof registerDto.email !== 'string' ||
      typeof registerDto.password !== 'string' ||
      typeof registerDto.confirmPassword !== 'string'
    ) {
      return false;
    }

    const fullNameLength = Array.from(registerDto.fullName).length;
    const password = registerDto.password;

    return (
      fullNameLength >= 4 &&
      fullNameLength <= 25 &&
      fullNamePattern.test(registerDto.fullName) &&
      registerDto.email.length > 0 &&
      registerDto.email.length <= 255 &&
      isEmail(registerDto.email) &&
      password.length >= 8 &&
      password.length <= 64 &&
      !/\s/.test(password) &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      passwordSpecialCharacterPattern.test(password) &&
      permittedPasswordPattern.test(password) &&
      registerDto.confirmPassword.length > 0 &&
      registerDto.confirmPassword === password
    );
  }

  /** Independently enforces BR-LOG-01 and BR-LOG-02. */
  isLoginInputValid(loginDto: LoginDto): boolean {
    return (
      typeof loginDto.email === 'string' &&
      typeof loginDto.password === 'string' &&
      loginDto.email.length > 0 &&
      isEmail(loginDto.email) &&
      loginDto.password.length > 0
    );
  }

  /** Normalizes a full name according to BR-REG-01. */
  private normalizeFullName(fullName: string): string {
    return typeof fullName === 'string'
      ? fullName.normalize('NFC').trim()
      : fullName;
  }

  /** Normalizes an email according to BR-REG-02. */
  private normalizeEmail(email: string): string {
    return typeof email === 'string' ? email.trim().toLowerCase() : email;
  }

  /** Checks case-insensitive normalized email ownership. */
  private normalizedEmailExists(
    repository: Repository<User>,
    email: string,
  ): Promise<boolean> {
    return repository.exists({ where: { normalizedEmail: email } });
  }

  /** Derives a stable unique username from the email local part. */
  private generateUsername(email: string): string {
    const localPart = email.slice(0, email.indexOf('@')).slice(0, 238);
    const suffix = createHash('sha256').update(email).digest('hex').slice(0, 12);
    return `${localPart}_${suffix}`;
  }

  /** Identifies MySQL unique-key failures caused by concurrent writes. */
  private isUniqueConstraintViolation(error: unknown): boolean {
    const databaseError = error as DatabaseError;
    return databaseError?.code === 'ER_DUP_ENTRY' || databaseError?.errno === 1062;
  }

}
