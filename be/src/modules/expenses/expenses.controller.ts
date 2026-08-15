import {
  Controller,
  Get,
  HttpStatus,
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

/** Exposes the protected monthly expense summary endpoint. */
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
}
