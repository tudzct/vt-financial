import {
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
import { SavingsService } from './savings.service';

const APPLICATION_TIME_ZONE = 'Asia/Ho_Chi_Minh';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/** Exposes the protected monthly savings comparison endpoint. */
@ApiTags('savings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('v1/savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  /** Resolves the optional year and returns the authenticated user's summary. */
  @Get('summary')
  @ApiOperation({ summary: 'Get monthly savings summary' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Summary retrieved' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Savings calculation failed',
  })
  getSavingsSummary(
    @Req() request: AuthenticatedRequest,
    @Query('year') year?: string,
  ) {
    const currentYear = Number(
      new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        timeZone: APPLICATION_TIME_ZONE,
      }).format(new Date()),
    );
    const parsedYear = parseInt(year ?? '', 10);
    const resolvedYear =
      Number.isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100
        ? currentYear
        : parsedYear;

    return this.savingsService.getSavingsSummary(
      request.user.userId,
      resolvedYear,
    );
  }
}
