import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import { TransactionStatus, TransactionType } from '../transaction.entity';

const INVALID_TRANSACTION_MESSAGE = 'Invalid or missing transaction data';
const validationOptions = { message: INVALID_TRANSACTION_MESSAGE };

/** Validates the public payload used to create a transaction. */
export class CreateTransactionDto {
  @Type(() => Number)
  @IsInt(validationOptions)
  @IsPositive(validationOptions)
  accountId: number;

  @IsString(validationOptions)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, validationOptions)
  transactionDate: string;

  @IsEnum(TransactionType, validationOptions)
  type: TransactionType;

  @IsString(validationOptions)
  @Matches(/\S/, validationOptions)
  itemDescription: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt(validationOptions)
  @IsPositive(validationOptions)
  category_id?: number | null;

  @IsString(validationOptions)
  @Matches(/\S/, validationOptions)
  shopName: string;

  @Type(() => Number)
  @IsNumber({}, validationOptions)
  @Min(0.01, validationOptions)
  amount: number;

  @IsString(validationOptions)
  @Matches(/\S/, validationOptions)
  paymentMethod: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(TransactionStatus, validationOptions)
  status?: TransactionStatus;
}
