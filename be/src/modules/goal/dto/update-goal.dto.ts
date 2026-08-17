import { Type } from 'class-transformer';
import { IsDefined, IsNumber, IsPositive } from 'class-validator';

const TARGET_AMOUNT_ERROR = 'target_amount must be a positive number';

/** Validates the target-only financial-goal update payload. */
export class UpdateGoalDto {
  @IsDefined({ message: TARGET_AMOUNT_ERROR })
  @Type(() => Number)
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: TARGET_AMOUNT_ERROR },
  )
  @IsPositive({ message: TARGET_AMOUNT_ERROR })
  target_amount: number;
}
