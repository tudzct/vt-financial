import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protects endpoints with the configured bearer JWT strategy. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
