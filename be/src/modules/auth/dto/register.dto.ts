import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const normalizeFullName = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.normalize('NFC').trim() : value;

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @IsDefined({ message: 'fullName is required' })
  @IsString({ message: 'fullName must be a string' })
  @Transform(normalizeFullName)
  @Length(4, 25, {
    message: 'fullName must be between 4 and 25 characters',
  })
  @Matches(/^[\p{L}]+(?: [\p{L}]+)*$/u, {
    message:
      'fullName may contain only Unicode letters separated by single spaces',
  })
  fullName: string;

  @IsDefined({ message: 'email is required' })
  @IsString({ message: 'email must be a string' })
  @Transform(normalizeEmail)
  @IsNotEmpty({ message: 'email must not be empty' })
  @MaxLength(255, { message: 'email must not exceed 255 characters' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @IsDefined({ message: 'password is required' })
  @IsString({ message: 'password must be a string' })
  @Length(8, 64, {
    message: 'password must be between 8 and 64 characters',
  })
  @Matches(/^\S+$/, { message: 'password must not contain whitespace' })
  @Matches(/[a-z]/, {
    message: 'password must contain at least one lowercase letter',
  })
  @Matches(/[A-Z]/, {
    message: 'password must contain at least one uppercase letter',
  })
  @Matches(/[0-9]/, {
    message: 'password must contain at least one digit',
  })
  @Matches(/[!@#$%^&*(){}\-_+=[\],./<>?\\|:;]/, {
    message: 'password must contain at least one permitted special character',
  })
  @Matches(/^[A-Za-z0-9!@#$%^&*(){}_=+[\],./<>?\\|:;-]+$/, {
    message: 'password contains a character that is not permitted',
  })
  password: string;

  @IsDefined({ message: 'confirmPassword is required' })
  @IsString({ message: 'confirmPassword must be a string' })
  @IsNotEmpty({ message: 'confirmPassword must not be empty' })
  confirmPassword: string;
}
