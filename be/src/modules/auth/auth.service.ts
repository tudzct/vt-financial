import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource, Raw, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { RegisterDto } from './dto/register.dto';
import {
  RegisteredUserDto,
  RegisterResponseDto,
} from './dto/register-response.dto';
import { PasswordHasher } from './password-hasher.service';
import {
  isStructurallyValidRegistration,
  normalizeRegisterDto,
} from './registration.rules';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly passwordHasher: PasswordHasher,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const normalizedDto = normalizeRegisterDto(dto);
    this.assertRegistrationInput(normalizedDto);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(User);
        await this.assertEmailAvailable(users, normalizedDto.email);

        const username = await this.generateUniqueUsername(
          users,
          normalizedDto.email,
        );
        const passwordHash = await this.passwordHasher.hash(
          normalizedDto.password,
          BCRYPT_ROUNDS,
        );

        const user = users.create({
          fullName: normalizedDto.fullName,
          email: normalizedDto.email,
          username,
          passwordHash,
          totalBalance: 0,
        });
        const createdUser = await users.save(user);
        const mappedUser = this.mapRegisteredUser(createdUser);
        const accessToken = await this.jwtService.signAsync({
          sub: mappedUser.id,
          email: mappedUser.email,
        });

        return {
          success: true,
          message: 'Registration successful',
          data: {
            accessToken,
            user: mappedUser,
          },
        };
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (this.isUniqueConstraintViolation(error)) {
        throw new ConflictException('This email is already registered.');
      }
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  isRegistrationInputValid(dto: RegisterDto): boolean {
    const normalizedDto = normalizeRegisterDto(dto);
    return (
      isStructurallyValidRegistration(normalizedDto) &&
      !this.isBlacklisted(normalizedDto.password)
    );
  }

  private assertRegistrationInput(dto: RegisterDto): void {
    if (dto.confirmPassword !== dto.password) {
      throw new BadRequestException('Passwords do not match.');
    }
    if (!isStructurallyValidRegistration(dto)) {
      throw new BadRequestException('Registration data is invalid.');
    }
    if (this.isBlacklisted(dto.password)) {
      throw new BadRequestException('Password is too common.');
    }
  }

  private async assertEmailAvailable(
    users: Repository<User>,
    normalizedEmail: string,
  ): Promise<void> {
    const existingUser = await users.findOne({
      where: {
        email: Raw(
          (emailColumn) => `LOWER(TRIM(${emailColumn})) = :normalizedEmail`,
          { normalizedEmail },
        ),
      },
    });
    if (existingUser) {
      throw new ConflictException('This email is already registered.');
    }
  }

  private async generateUniqueUsername(
    users: Repository<User>,
    normalizedEmail: string,
  ): Promise<string> {
    const emailPrefix = normalizedEmail.split('@')[0];
    let candidate = emailPrefix;
    let suffix = 2;

    while (await users.findOne({ where: { username: candidate } })) {
      candidate = `${emailPrefix}${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private mapRegisteredUser(user: User): RegisteredUserDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    };
  }

  private isBlacklisted(password: string): boolean {
    const configuredBlacklist = this.configService.get<string>(
      'REGISTRATION_PASSWORD_BLACKLIST',
      '',
    );
    const blacklistedPasswords = configuredBlacklist
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    return blacklistedPasswords.includes(password.toLowerCase());
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const driverError = (error as { driverError?: { code?: string } })
      .driverError;
    return driverError?.code === 'ER_DUP_ENTRY';
  }
}
