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
import { ApiProperty } from '@nestjs/swagger';
import {
  FULL_NAME_PATTERN,
  PASSWORD_ALLOWED_PATTERN,
  PASSWORD_SPECIAL_PATTERN,
} from '../registration.rules';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', minLength: 4, maxLength: 25 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.normalize('NFC').trim() : value,
  )
  @IsDefined({ message: 'Full name is required.' })
  @IsString({ message: 'Full name must be a string.' })
  @Length(4, 25, {
    message: 'Full name must contain between 4 and 25 characters.',
  })
  @Matches(FULL_NAME_PATTERN, {
    message:
      'Full name may contain only Unicode letters separated by single spaces.',
  })
  fullName: string;

  @ApiProperty({ example: 'user@example.com', maxLength: 255 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsDefined({ message: 'Email is required.' })
  @IsString({ message: 'Email must be a string.' })
  @IsNotEmpty({ message: 'Email is required.' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters.' })
  @IsEmail({}, { message: 'Email is invalid.' })
  email: string;

  @ApiProperty({ example: 'P@ssw0rd!', minLength: 8, maxLength: 64 })
  @IsDefined({ message: 'Password is required.' })
  @IsString({ message: 'Password must be a string.' })
  @Length(8, 64, {
    message: 'Password must contain between 8 and 64 characters.',
  })
  @Matches(/^\S+$/, { message: 'Password must not contain whitespace.' })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter.',
  })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter.',
  })
  @Matches(/[0-9]/, {
    message: 'Password must contain at least one digit.',
  })
  @Matches(PASSWORD_SPECIAL_PATTERN, {
    message: 'Password must contain at least one permitted special character.',
  })
  @Matches(PASSWORD_ALLOWED_PATTERN, {
    message: 'Password contains a character that is not permitted.',
  })
  password: string;

  @ApiProperty({ example: 'P@ssw0rd!' })
  @IsDefined({ message: 'Password confirmation is required.' })
  @IsString({ message: 'Password confirmation must be a string.' })
  @IsNotEmpty({ message: 'Password confirmation is required.' })
  confirmPassword: string;
}
