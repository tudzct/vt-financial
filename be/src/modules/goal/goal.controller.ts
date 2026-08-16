import { Controller, Get, HttpStatus, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { GoalService } from './goal.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/** Exposes protected financial-goal endpoints. */
@ApiTags('goals')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('v1/goals')
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  /** Returns the authenticated user's active goals and calculated progress. */
  @Get()
  @ApiOperation({ summary: 'List financial goals' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Goals retrieved' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Goal retrieval or calculation failed',
  })
  async getGoals(@Req() request: AuthenticatedRequest) {
    const data = await this.goalService.getGoals(request.user.userId);

    return {
      success: true,
      message: 'Lấy danh sách mục tiêu thành công',
      data,
    };
  }
}
