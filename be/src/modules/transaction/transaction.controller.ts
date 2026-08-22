import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequestUser } from '../auth/jwt.strategy';
import { TransactionListQueryDto } from './dto/transaction-list-query.dto';
import { TransactionService } from './transaction.service';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedRequestUser };

/** Exposes authenticated transaction endpoints. */
@ApiTags('transactions')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  /** Lists transactions belonging to accounts owned by the current user. */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List owned transactions' })
  findAll(
    @Request() request: AuthenticatedRequest,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const query = TransactionListQueryDto.parse(rawQuery);
    return this.transactionService.findAllByUserId(request.user.userId, query);
  }
}
