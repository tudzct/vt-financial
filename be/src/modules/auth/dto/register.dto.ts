import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotCommonPassword, MatchesProperty } from '../register.validators';

const FULL_NAME_PATTERN = /^\p{L}+(?: \p{L}+)*$/u;
const PASSWORD_ALLOWED_PATTERN =
  /^[A-Za-z0-9!@#$%^&*(){}_+=\u005b\u005d,./<>?\\|:;\u002d]+$/;
const PASSWORD_SPECIAL_PATTERN =
  /[!@#$%^&*(){}_+=\u005b\u005d,./<>?\\|:;\u002d]/;

export class RegisterDto {
  @ApiProperty({ minLength: 4, maxLength: 25, example: 'Nguyễn Văn An' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.normalize('NFC').trim() : value,
  )
  @IsString()
  @MinLength(4)
  @MaxLength(25)
  @Matches(FULL_NAME_PATTERN, {
    message: 'fullName must contain only letters separated by single spaces',
  })
  fullName: string;

  @ApiProperty({ maxLength: 255, example: 'visitor@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLocaleLowerCase('en-US') : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, maxLength: 64, writeOnly: true })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^\S+$/, { message: 'password must not contain whitespace' })
  @Matches(/[a-z]/, { message: 'password must contain a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' })
  @Matches(/[0-9]/, { message: 'password must contain a digit' })
  @Matches(PASSWORD_SPECIAL_PATTERN, {
    message: 'password must contain a permitted special character',
  })
  @Matches(PASSWORD_ALLOWED_PATTERN, {
    message: 'password contains an unsupported character',
  })
  @IsNotCommonPassword({ message: 'password is too common' })
  password: string;

  @ApiProperty({ minLength: 1, writeOnly: true })
  @IsString()
  @IsNotEmpty()
  @MatchesProperty('password', { message: 'Passwords do not match.' })
  confirmPassword: string;
}
