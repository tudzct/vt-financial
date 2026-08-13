import {
  BadRequestException,
  Controller,
  Get,
  HttpStatus,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import {
  AuthenticatedUser,
} from '../auth/jwt.strategy';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  TransactionFilterType,
  TransactionListQueryDto,
} from './dto/transaction-list-query.dto';
import { TransactionService } from './transaction.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/** Exposes protected transaction-history endpoints. */
@ApiTags('transactions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('v1/transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  /** Lists transactions owned by the authenticated user. */
  @Get()
  @ApiOperation({ summary: 'List owned transactions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transactions retrieved' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid query' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Retrieval failed' })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() query: TransactionListQueryDto,
  ) {
    const type = query.type as TransactionFilterType;
    const limit = this.parseInteger(query.limit, 10, false);
    const offset = this.parseInteger(query.offset, 0, true);

    if (!Object.values(TransactionFilterType).includes(type)) {
      throw new BadRequestException('Invalid transaction query parameter');
    }

    return this.transactionService.findAllByUserId(
      request.user.userId,
      type,
      limit,
      offset,
    );
  }

  /** Parses a complete base-10 integer and enforces its lower bound. */
  private parseInteger(
    value: string | undefined,
    defaultValue: number,
    allowZero: boolean,
  ): number {
    if (value === undefined) {
      return defaultValue;
    }

    if (!/^-?\d+$/.test(value)) {
      throw new BadRequestException('Invalid transaction query parameter');
    }

    const parsedValue = Number(value);
    const isInvalid =
      !Number.isSafeInteger(parsedValue) ||
      (allowZero ? parsedValue < 0 : parsedValue <= 0);

    if (isInvalid) {
      throw new BadRequestException('Invalid transaction query parameter');
    }

    return parsedValue;
  }
}
