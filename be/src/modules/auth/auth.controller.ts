import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** Exposes public authentication endpoints. */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Registers a user and creates an authenticated session. */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register with name, email, and password' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Registration successful' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email already registered' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Registration failed' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /** Authenticates a registered user with email and password. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Login successful' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid credentials' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
