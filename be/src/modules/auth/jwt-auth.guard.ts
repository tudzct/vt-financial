import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protects endpoints with Bearer JWT authentication. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
