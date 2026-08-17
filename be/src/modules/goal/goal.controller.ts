import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
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

  /** Creates a financial goal owned by the authenticated user. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a financial goal' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Goal created' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid goal data',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Goal persistence failed',
  })
  async createGoal(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateGoalDto,
  ) {
    const goal = await this.goalService.createGoal(request.user.userId, dto);

    return {
      success: true,
      message: 'Goal created successfully',
      data: { goal_id: goal.goalId },
    };
  }

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

  /** Updates only the target amount of an owned financial goal. */
  @Put(':goalId')
  @ApiOperation({ summary: 'Update an owned financial goal' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Goal updated' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid target amount' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not the goal owner' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Goal not found' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Update failed' })
  async updateGoal(
    @Req() request: AuthenticatedRequest,
    @Param('goalId') goalId: string,
    @Body() dto: UpdateGoalDto,
  ) {
    const updatedGoal = await this.goalService.updateGoal(
      request.user.userId,
      parseInt(goalId, 10),
      dto,
    );

    return {
      success: true,
      message: 'Goal updated successfully',
      data: {
        updated_goal: {
          goal_id: updatedGoal.goalId,
          target_amount: Number(updatedGoal.targetAmount),
        },
      },
    };
  }
}
