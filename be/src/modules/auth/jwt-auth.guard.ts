import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Requires a valid Bearer JWT for protected routes. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
