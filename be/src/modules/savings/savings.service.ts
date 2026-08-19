import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Account } from '../account/account.entity';
import {
  Transaction,
  TransactionType,
} from '../transaction/transaction.entity';
import {
  MonthlySavingsDto,
  SavingsSummaryResponseDto,
} from './dto/monthly-savings.dto';

const AUTHENTICATION_ERROR_MESSAGE =
  'Không thể xác thực người dùng. Vui lòng đăng nhập lại.';
const SAVINGS_SUMMARY_ERROR_MESSAGE =
  'An internal server error occurred while processing the savings summary.';

interface MonthlySavingsRow {
  yearNumber: string;
  monthNumber: string;
  type: TransactionType;
  totalAmount: string;
}

/** Calculates read-only monthly savings for accounts owned by one user. */
@Injectable()
export class SavingsService {
  constructor(private readonly dataSource: DataSource) {}

  /** Implements UC-16 and BR-SAV-01 through BR-SAV-08. */
  async getSavingsSummary(
    userId: number,
    year: number,
  ): Promise<SavingsSummaryResponseDto> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException(AUTHENTICATION_ERROR_MESSAGE);
    }

    try {
      return await this.dataSource.transaction(
        'REPEATABLE READ',
        async (manager) => {
          const startDate = `${year - 1}-01-01`;
          const endDate = `${year}-12-31`;
          const rows = await manager
            .getRepository(Transaction)
            .createQueryBuilder('transaction')
            .select('YEAR(transaction.transactionDate)', 'yearNumber')
            .addSelect('MONTH(transaction.transactionDate)', 'monthNumber')
            .addSelect('transaction.type', 'type')
            .addSelect('COALESCE(SUM(transaction.amount), 0)', 'totalAmount')
            .innerJoin(
              Account,
              'account',
              'account.accountId = transaction.accountId',
            )
            .where('account.userId = :userId', { userId })
            .andWhere(
              'transaction.transactionDate BETWEEN :startDate AND :endDate',
              { startDate, endDate },
            )
            .groupBy('YEAR(transaction.transactionDate)')
            .addGroupBy('MONTH(transaction.transactionDate)')
            .addGroupBy('transaction.type')
            .orderBy('YEAR(transaction.transactionDate)', 'ASC')
            .addOrderBy('MONTH(transaction.transactionDate)', 'ASC')
            .getRawMany<MonthlySavingsRow>();

          const totals = new Map<string, { revenue: number; expense: number }>();

          rows.forEach((row) => {
            const rowYear = Number(row.yearNumber);
            const rowMonth = Number(row.monthNumber);
            const amount = Number(row.totalAmount);

            if (
              !Number.isInteger(rowYear) ||
              !Number.isInteger(rowMonth) ||
              rowMonth < 1 ||
              rowMonth > 12 ||
              !Number.isFinite(amount) ||
              !Object.values(TransactionType).includes(row.type)
            ) {
              throw new Error('Invalid savings aggregation result');
            }

            const key = `${rowYear}-${rowMonth}`;
            const total = totals.get(key) ?? { revenue: 0, expense: 0 };

            if (row.type === TransactionType.REVENUE) {
              total.revenue = amount;
            } else {
              total.expense = amount;
            }

            totals.set(key, total);
          });

          return {
            user_id: userId,
            year,
            summary: {
              this_year: this.buildYearSeries(year, totals),
              last_year: this.buildYearSeries(year - 1, totals),
            },
          };
        },
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException(SAVINGS_SUMMARY_ERROR_MESSAGE);
    }
  }

  /** Produces the complete January-through-December response sequence. */
  private buildYearSeries(
    year: number,
    totals: Map<string, { revenue: number; expense: number }>,
  ): MonthlySavingsDto[] {
    return Array.from({ length: 12 }, (_, index) => {
      const monthNumber = index + 1;
      const total = totals.get(`${year}-${monthNumber}`) ?? {
        revenue: 0,
        expense: 0,
      };

      return {
        month: String(monthNumber).padStart(2, '0'),
        amount: this.roundMoney(total.revenue - total.expense),
      };
    });
  }

  /** Normalizes a calculated monetary amount to two decimal places. */
  private roundMoney(value: number): number {
    if (!Number.isFinite(value)) {
      throw new Error('Invalid savings amount');
    }

    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
