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
const passwordSpecialCharacterPattern =
  /[!@#$%^&*(){}\-_+=\[\],./<>?\\|:;]/;
const permittedPasswordPattern =
  /^[A-Za-z0-9!@#$%^&*(){}_=+\[\],./<>?\\|:;\-]+$/;

/** Defines and normalizes the public registration request. */
export class RegisterDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.normalize('NFC').trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Length(4, 25)
  @Matches(fullNamePattern)
  fullName: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 64)
  @Matches(/^\S+$/)
  @Matches(/[a-z]/)
  @Matches(/[A-Z]/)
  @Matches(/[0-9]/)
  @Matches(passwordSpecialCharacterPattern)
  @Matches(permittedPasswordPattern)
  password: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
