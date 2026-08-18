import {
  IsDefined,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AccountType } from '../account.entity';

/** Validates the public payload used to create an owned bank account. */
export class CreateAccountDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsDefined({ message: 'Bank name is required.' })
  @IsString({ message: 'Bank name must be a string.' })
  @Matches(/\S/, { message: 'Bank name is required.' })
  bank_name: string;

  @IsDefined({ message: 'Account type is required.' })
  @IsEnum(AccountType, { message: 'Select a valid account type.' })
  account_type: AccountType;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Branch name must be a string.' })
  branch_name?: string;

  @IsDefined({ message: 'Account number is required.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Account number must be a numeric string.' })
  @Matches(/^\d+$/, { message: 'Account number must contain digits only.' })
  @MinLength(8, { message: 'Account number must contain 8 to 34 digits.' })
  @MaxLength(34, { message: 'Account number must contain 8 to 34 digits.' })
  account_number_full: string;

  @IsDefined({ message: 'Initial balance is required.' })
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: 'Initial balance must be a number.' },
  )
  @Min(0, { message: 'Initial balance must be greater than or equal to 0.' })
  balance: number;
}
