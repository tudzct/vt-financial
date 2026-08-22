import { BadRequestException } from '@nestjs/common';

export enum TransactionFilterType {
  ALL = 'All',
  REVENUE = 'Revenue',
  EXPENSE = 'Expense',
}

/** Contains the normalized transaction-list filter and pagination values. */
export class TransactionListQueryDto {
  type: TransactionFilterType;
  limit: number;
  offset: number;

  /** Strictly validates query values without accepting numeric prefixes. */
  static parse(query: Record<string, unknown>): TransactionListQueryDto {
    const type = query.type;
    const limit = this.parseInteger(query.limit, 10);
    const offset = this.parseInteger(query.offset, 0);
    const allowedTypes = Object.values(TransactionFilterType);

    if (
      typeof type !== 'string' ||
      !allowedTypes.includes(type as TransactionFilterType) ||
      limit === null ||
      limit <= 0 ||
      offset === null ||
      offset < 0
    ) {
      throw new BadRequestException('Invalid transaction query parameter');
    }

    return {
      type: type as TransactionFilterType,
      limit,
      offset,
    };
  }

  /** Parses an optional base-10 integer or returns the supplied default. */
  private static parseInteger(
    value: unknown,
    defaultValue: number,
  ): number | null {
    if (value === undefined) {
      return defaultValue;
    }

    if (typeof value !== 'string' || !/^-?\d+$/.test(value)) {
      return null;
    }

    const parsedValue = Number(value);
    return Number.isSafeInteger(parsedValue) ? parsedValue : null;
  }
}
