import { IsDefined, IsString } from 'class-validator';

/** Raw registration request values; normalized validation belongs to AuthService. */
export class RegisterDto {
  @IsDefined({ message: 'Full name is required.' })
  @IsString({ message: 'Full name must be a string.' })
  fullName: string;

  @IsDefined({ message: 'Email is required.' })
  @IsString({ message: 'Email must be a string.' })
  email: string;

  @IsDefined({ message: 'Password is required.' })
  @IsString({ message: 'Password must be a string.' })
  password: string;

  @IsDefined({ message: 'Password confirmation is required.' })
  @IsString({ message: 'Password confirmation must be a string.' })
  confirmPassword: string;
}
