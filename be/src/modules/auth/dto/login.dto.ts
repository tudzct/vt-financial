import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

const normalizeEmail = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Validates and normalizes the public login request payload. */
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsEmail()
  @Transform(({ value }) => normalizeEmail(value))
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
