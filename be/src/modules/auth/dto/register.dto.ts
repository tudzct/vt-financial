import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const fullNamePattern = /^[\p{L}]+(?: [\p{L}]+)*$/u;
const passwordPattern =
  /^[A-Za-z0-9!@#$%^&*(){}_\-=+\[\],./<>?\\|:;]+$/;
const passwordSpecialCharacterPattern =
  /[!@#$%^&*(){}_\-=+\[\],./<>?\\|:;]/;

/** Defines and normalizes the public registration request. */
export class RegisterDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.normalize('NFC').trim() : value,
  )
  @IsString({ message: 'Full name must be a string.' })
  @IsNotEmpty({ message: 'Full name is required.' })
  @Length(4, 25, {
    message: 'Full name must be between 4 and 25 characters.',
  })
  @Matches(fullNamePattern, {
    message: 'Full name may contain only letters separated by single spaces.',
  })
  fullName: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'Email must be a string.' })
  @IsNotEmpty({ message: 'Email is required.' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters.' })
  @IsEmail({}, { message: 'Email address is invalid.' })
  email: string;

  @IsString({ message: 'Password must be a string.' })
  @Length(8, 64, {
    message: 'Password must be between 8 and 64 characters.',
  })
  @Matches(/^[^\s]+$/, { message: 'Password must not contain whitespace.' })
  @Matches(/[a-z]/, { message: 'Password must contain a lowercase letter.' })
  @Matches(/[A-Z]/, { message: 'Password must contain an uppercase letter.' })
  @Matches(/[0-9]/, { message: 'Password must contain a digit.' })
  @Matches(passwordSpecialCharacterPattern, {
    message: 'Password must contain a permitted special character.',
  })
  @Matches(passwordPattern, {
    message: 'Password contains a character that is not permitted.',
  })
  password: string;

  @IsString({ message: 'Password confirmation must be a string.' })
  @IsNotEmpty({ message: 'Password confirmation is required.' })
  confirmPassword: string;
}
