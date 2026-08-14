import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { AccountService } from './account.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/** Exposes the protected owned-account lookup. */
@ApiTags('accounts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('v1/accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /** Lists accounts owned by the authenticated user. */
  @Get()
  @ApiOperation({ summary: 'List owned accounts' })
  findAll(@Req() request: AuthenticatedRequest) {
    return this.accountService.findAllByUserId(request.user.userId);
  }
}
