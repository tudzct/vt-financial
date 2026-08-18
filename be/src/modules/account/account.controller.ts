import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

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

  /** Returns one owned account with at most five recent transactions. */
  @Get(':id')
  @ApiOperation({ summary: 'Get owned account details' })
  findOne(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestException('Invalid account ID.');
    }

    const accountId = Number(id);
    if (!Number.isSafeInteger(accountId)) {
      throw new BadRequestException('Invalid account ID.');
    }

    return this.accountService.findOneWithTransactions(
      accountId,
      request.user.userId,
    );
  }

  /** Creates an account owned by the authenticated JWT subject. */
  @Post()
  @ApiOperation({ summary: 'Create an owned bank account' })
  createAccount(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountService.create(request.user.userId, dto);
  }

  /** Updates an account owned by the authenticated JWT subject. */
  @Put(':id')
  @ApiOperation({ summary: 'Update an owned bank account' })
  updateAccount(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateAccountDto,
  ) {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestException('Invalid account ID.');
    }

    const accountId = Number(id);
    if (!Number.isSafeInteger(accountId)) {
      throw new BadRequestException('Invalid account ID.');
    }

    return this.accountService.update(accountId, request.user.userId, dto);
  }

  /** Deletes an owned account and all of its related transactions. */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an owned bank account' })
  deleteAccount(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestException('Invalid account ID.');
    }

    const accountId = Number(id);
    if (!Number.isSafeInteger(accountId)) {
      throw new BadRequestException('Invalid account ID.');
    }

    return this.accountService.delete(accountId, request.user.userId);
  }
}
