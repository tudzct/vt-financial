import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

/** Exposes public authentication endpoints. */
@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Creates a user and returns an authenticated session. */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a user account' })
  @ApiCreatedResponse({ description: 'Registration successful' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
