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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ExpensesService } from './expenses.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

const INVALID_MONTH_MESSAGE =
  'Tham số month không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM (ví dụ: 2025-11)';

/** Exposes protected monthly expense reporting endpoints. */
@ApiTags('expenses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('v1/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  /** Returns the authenticated user's sparse current-year expense summary. */
  @Get('summary')
  @ApiOperation({ summary: 'Get monthly expense summary' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Summary retrieved' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Expense aggregation failed',
  })
  async getExpenseSummary(@Req() request: AuthenticatedRequest) {
    const data = await this.expensesService.getExpenseSummary(
      request.user.userId,
    );

    return { data };
  }

  /** Returns the selected month's expense breakdown by category. */
  @Get('breakdown')
  @ApiOperation({ summary: 'Get expense breakdown by category' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Breakdown retrieved' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid month' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No expense data' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Breakdown calculation failed',
  })
  async getExpensesBreakdown(
    @Req() request: AuthenticatedRequest,
    @Query('month') month?: string,
  ) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException(INVALID_MONTH_MESSAGE);
    }

    const data = await this.expensesService.getExpensesBreakdown(
      request.user.userId,
      month,
    );

    return { data };
  }
}
