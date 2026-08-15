import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** Exposes public authentication endpoints. */
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Authenticates a visitor with email and password. */
  @Post('login')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: () =>
        new BadRequestException('Bad Request / Input validation failed.'),
    }),
  )
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /** Registers a visitor and returns an authenticated session payload. */
  @Post('register')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: () =>
        new BadRequestException('Bad Request / Input validation failed.'),
    }),
  )
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
