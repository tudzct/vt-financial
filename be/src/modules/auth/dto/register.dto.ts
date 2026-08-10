import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const normalizeText = (value: unknown): unknown =>
  typeof value === 'string' ? value.normalize('NFC').trim() : value;

const normalizeEmail = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Validates the public registration request payload. */
export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(25)
  @Matches(/^\p{L}+(?: \p{L}+)*$/u)
  @Transform(({ value }) => normalizeText(value))
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsEmail()
  @Transform(({ value }) => normalizeEmail(value))
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9!@#$%^&*(){}_=+\[\],./<>?\\|:;\-]+$/)
  @Matches(/[a-z]/)
  @Matches(/[A-Z]/)
  @Matches(/[0-9]/)
  @Matches(/[!@#$%^&*(){}\-_+=\[\],./<>?\\|:;]/)
  password: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
