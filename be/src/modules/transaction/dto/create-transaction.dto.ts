import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  TransactionStatus,
  TransactionType,
} from '../transaction.entity';

const normalizeText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.normalize('NFC').trim() : value;

/** Validates and normalizes a transaction creation request. */
export class CreateTransactionDto {
  @IsInt()
  @Min(1)
  accountId: number;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  transactionDate: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  itemDescription: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  category_id?: number | null;

  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  shopName: string;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0.01)
  @Max(9999999999999.99)
  amount: number;

  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  paymentMethod: string;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status: TransactionStatus = TransactionStatus.COMPLETE;
}
