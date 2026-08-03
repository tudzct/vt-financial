import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';

const BCRYPT_ROUNDS = 10;
const DUPLICATE_EMAIL_MESSAGE = 'This email is already registered.';

interface DriverErrorShape {
  code?: unknown;
  errno?: unknown;
  message?: unknown;
}

const getDriverError = (error: unknown): DriverErrorShape | undefined => {
  if (!(error instanceof QueryFailedError)) {
    return undefined;
  }
  const driverError: unknown = error.driverError;
  return typeof driverError === 'object' && driverError !== null
    ? (driverError as DriverErrorShape)
    : undefined;
};

const isDuplicateKeyError = (error: unknown): boolean => {
  const driverError = getDriverError(error);
  return driverError?.code === 'ER_DUP_ENTRY' || driverError?.errno === 1062;
};

const isEmailDuplicateError = (error: unknown): boolean => {
  const driverError = getDriverError(error);
  return (
    isDuplicateKeyError(error) &&
    typeof driverError?.message === 'string' &&
    /normalized_email|IDX_USERS_NORMALIZED_EMAIL|email/i.test(
      driverError.message,
    )
  );
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const normalizedEmail = dto.email.trim().toLocaleLowerCase('en-US');
    const normalizedName = dto.fullName.normalize('NFC').trim();
    this.assertPasswordRules(dto.password, normalizedEmail);

    const emailExists = await this.usersRepository.exists({
      where: { normalizedEmail },
    });
    if (emailExists) {
      throw new ConflictException(DUPLICATE_EMAIL_MESSAGE);
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(User);
        const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
        const localPart = normalizedEmail.slice(
          0,
          normalizedEmail.indexOf('@'),
        );

        for (let suffix = 0; suffix < 1000; suffix += 1) {
          const username =
            suffix === 0 ? localPart : `${localPart}_${suffix + 1}`;
          const user = repository.create({
            fullName: normalizedName,
            email: normalizedEmail,
            normalizedEmail,
            username,
            passwordHash,
            totalBalance: 0,
            phoneNumber: null,
            profilePictureUrl: null,
          });

          try {
            const savedUser = await repository.save(user);
            const accessToken = await this.jwtService.signAsync({
              sub: savedUser.userId,
              email: savedUser.email,
            });

            return {
              success: true,
              message: 'Account registered successfully.',
              data: {
                accessToken,
                user: {
                  id: savedUser.userId,
                  fullName: savedUser.fullName,
                  email: savedUser.email,
                },
              },
            };
          } catch (error: unknown) {
            if (isEmailDuplicateError(error)) {
              throw new ConflictException(DUPLICATE_EMAIL_MESSAGE);
            }
            if (isDuplicateKeyError(error)) {
              continue;
            }
            throw error;
          }
        }

        throw new InternalServerErrorException('Unable to create account.');
      });
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      if (isEmailDuplicateError(error)) {
        throw new ConflictException(DUPLICATE_EMAIL_MESSAGE);
      }
      throw new InternalServerErrorException('Unable to register account.');
    }
  }

  private assertPasswordRules(password: string, normalizedEmail: string): void {
    const normalizedPassword = password.toLocaleLowerCase('en-US');
    const localPart = normalizedEmail.slice(0, normalizedEmail.indexOf('@'));
    if (
      normalizedPassword === normalizedEmail ||
      normalizedPassword === localPart
    ) {
      throw new BadRequestException(
        'Password must not match the email or its local part.',
      );
    }
  }
}
