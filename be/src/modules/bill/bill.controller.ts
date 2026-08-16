import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { BillService } from './bill.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/** Exposes the authenticated upcoming-bills list operation. */
@ApiTags('bills')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('v1/bills')
export class BillController {
  constructor(private readonly billService: BillService) {}

  /** Returns the authenticated user's normalized upcoming bills. */
  @Get()
  @ApiOperation({ summary: 'List upcoming bills' })
  async getUpcomingBills(@Req() request: AuthenticatedRequest) {
    const data = await this.billService.findUpcomingBillsByUserId(
      request.user.userId,
    );

    return { success: true, message: 'Fetched successfully', data };
  }
}
