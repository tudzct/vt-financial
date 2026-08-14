import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export enum TransactionFilterType {
  ALL = 'All',
  REVENUE = 'Revenue',
  EXPENSE = 'Expense',
}

/** Describes the supported transaction list query parameters. */
export class TransactionListQueryDto {
  @ApiProperty({ enum: TransactionFilterType })
  @IsOptional()
  @IsString()
  type: string;

  @ApiPropertyOptional({ default: 10, minimum: 1, type: Number })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0, type: Number })
  @IsOptional()
  @IsString()
  offset?: string;
}
