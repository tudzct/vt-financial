import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/user.entity';

export class RegisteredUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;
}

export class RegisterDataDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ type: RegisteredUserDto })
  user: RegisteredUserDto;
}

export class RegisterResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Registration successful' })
  message: string;

  @ApiProperty({ type: RegisterDataDto, required: false })
  data?: RegisterDataDto;
}

export class AuthResponse {
  success: boolean;
  user?: User;
  accessToken?: string;
}
