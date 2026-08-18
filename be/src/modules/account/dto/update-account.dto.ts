import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { AccountType } from '../account.entity';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Validates and normalizes API-ACCOUNT-UPDATE input. */
export class UpdateAccountDto {
  @Transform(trimString)
  @IsDefined({ message: 'The bank name is required.' })
  @IsString({ message: 'The bank name must be a string.' })
  @IsNotEmpty({ message: 'The bank name is required.' })
  bank_name: string;

  @IsDefined({ message: 'The account type is required.' })
  @IsEnum(AccountType, { message: 'The account type is invalid.' })
  account_type: AccountType;

  @Transform(trimString)
  @IsOptional()
  @IsString({ message: 'The branch name must be a string.' })
  branch_name?: string | null;

  @Transform(trimString)
  @IsDefined({ message: 'The account number is required.' })
  @IsString({ message: 'The account number must be a string.' })
  @IsNotEmpty({ message: 'The account number is required.' })
  @Matches(/^[0-9]+$/, {
    message: 'The account number must contain only numeric digits.',
  })
  @Length(8, 34, {
    message: 'The account number must be between 8 and 34 digits.',
  })
  account_number_full: string;

  @IsDefined({ message: 'The balance is required.' })
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: 'The balance must be a valid number.' },
  )
  @Min(0, { message: 'The balance must be greater than or equal to 0.' })
  balance: number;
}
