import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedJwtUser } from '../auth/jwt.strategy';
import { ExpensesService } from './expenses.service';

type AuthenticatedRequest = Request & { user: AuthenticatedJwtUser };

/** Exposes protected expense-summary endpoints. */
@ApiTags('expenses')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  /** Returns the authenticated user's current-year expense totals by month. */
  @Get('summary')
  @UseGuards(JwtAuthGuard)
  getExpenseSummary(@Req() request: AuthenticatedRequest) {
    return this.expensesService.getExpenseSummary(request.user.sub);
  }
}
