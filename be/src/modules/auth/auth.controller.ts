import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService, RegisterResponseDto } from './auth.service';
import { RegisterDto } from './dto/register.dto';

/** Public authentication endpoints. */
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }
}
