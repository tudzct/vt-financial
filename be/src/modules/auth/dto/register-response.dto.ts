export class RegisteredUserDto {
  id: number;
  fullName: string;
  email: string;
}

export class RegisterDataDto {
  accessToken: string;
  user: RegisteredUserDto;
}

export class RegisterResponseDto {
  success: boolean;
  message: string;
  data?: RegisterDataDto;
}
