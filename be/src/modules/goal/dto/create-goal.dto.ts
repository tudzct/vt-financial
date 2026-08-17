import {
  IsDateString,
  IsDefined,
  IsEnum,
  IsInt,
  IsNumber,
  IsPositive,
  Matches,
  ValidateIf,
} from 'class-validator';
import { GoalType } from '../goal.entity';

/** Validates the payload used to create a financial goal. */
export class CreateGoalDto {
  @IsDefined({ message: 'goal_type is required' })
  @IsEnum(GoalType, {
    message: 'goal_type must be either Saving or Expense_Limit',
  })
  goal_type: GoalType;

  @ValidateIf((dto: CreateGoalDto) => dto.goal_type === GoalType.EXPENSE_LIMIT)
  @IsDefined({ message: 'category_id is required for Expense_Limit goals' })
  @IsInt({ message: 'category_id must be an integer' })
  @IsPositive({ message: 'category_id must be a positive integer' })
  category_id?: number | null;

  @IsDefined({ message: 'start_date is required' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'start_date must use YYYY-MM-DD format',
  })
  @IsDateString(
    { strict: true },
    { message: 'start_date must be a valid date' },
  )
  start_date: string;

  @IsDefined({ message: 'end_date is required' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'end_date must use YYYY-MM-DD format',
  })
  @IsDateString({ strict: true }, { message: 'end_date must be a valid date' })
  end_date: string;

  @IsDefined({ message: 'target_amount is required' })
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: 'target_amount must be a number' },
  )
  @IsPositive({ message: 'target_amount must be greater than 0' })
  target_amount: number;
}
