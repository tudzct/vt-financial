import { ApiProperty } from '@nestjs/swagger';

export class RegisteredUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Nguyễn Văn An' })
  fullName: string;

  @ApiProperty({ example: 'visitor@example.com' })
  email: string;
}

export class RegisterResponseDataDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ type: RegisteredUserDto })
  user: RegisteredUserDto;
}

export class RegisterResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 'Account registered successfully.' })
  message: string;

  @ApiProperty({ type: RegisterResponseDataDto })
  data: RegisterResponseDataDto;
}
