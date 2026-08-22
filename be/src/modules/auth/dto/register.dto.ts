import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const normalizeFullName = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.normalize('NFC').trim() : value;

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Validated input for public account registration. */
export class RegisterDto {
  @IsDefined({ message: 'Full name is required' })
  @IsString({ message: 'Full name must be a string' })
  @Transform(normalizeFullName)
  @Length(4, 25, { message: 'Full name must be between 4 and 25 characters' })
  @Matches(/^\p{L}+(?: \p{L}+)*$/u, {
    message: 'Full name may contain only letters separated by single spaces',
  })
  fullName: string;

  @IsDefined({ message: 'Email is required' })
  @IsString({ message: 'Email must be a string' })
  @Transform(normalizeEmail)
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsDefined({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @Length(8, 64, { message: 'Password must be between 8 and 64 characters' })
  @Matches(/^[A-Za-z0-9!@#$%^&*(){}_+=\[\],./<>?\\|:;\-]+$/, {
    message: 'Password contains unsupported characters',
  })
  @Matches(/[a-z]/, { message: 'Password must contain a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'Password must contain an uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a number' })
  @Matches(/[!@#$%^&*(){}_+=\[\],./<>?\\|:;\-]/, {
    message: 'Password must contain a special character',
  })
  password: string;

  @IsDefined({ message: 'Password confirmation is required' })
  @IsString({ message: 'Password confirmation must be a string' })
  confirmPassword: string;
}
