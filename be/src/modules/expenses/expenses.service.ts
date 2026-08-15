import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Account } from '../account/account.entity';
import { Transaction, TransactionType } from '../transaction/transaction.entity';

export interface ExpenseSummaryItem {
  month: string;
  totalExpense: number;
}

interface ExpenseSummaryRow {
  monthNumber: string;
  totalExpense: string;
}

const MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Implements BR-EXP-01, BR-EXP-02, BR-EXP-03, BR-EXP-05, and BR-EXP-06. */
@Injectable()
export class ExpensesService {
  constructor(private readonly dataSource: DataSource) {}

  /** Aggregates eligible owned Expense rows without modifying persisted account or transaction data. */
  async getExpenseSummary(userId: number) {
    try {
      const currentYear = this.getCurrentYear();
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear + 1}-01-01`;

      const data = await this.dataSource.transaction(
        'REPEATABLE READ',
        async (manager): Promise<ExpenseSummaryItem[]> => {
          const rows = await manager
            .getRepository(Transaction)
            .createQueryBuilder('expense')
            .innerJoin(Account, 'account', 'account.account_id = expense.account_id')
            .select('MONTH(expense.transaction_date)', 'monthNumber')
            .addSelect('SUM(expense.amount)', 'totalExpense')
            // BR-EXP-01 scopes rows to accounts owned by the authenticated user.
            .where('account.user_id = :userId', { userId })
            .andWhere('expense.type = :transactionType', {
              transactionType: TransactionType.EXPENSE,
            })
            // BR-EXP-02 uses an inclusive current-year start and exclusive next-year boundary.
            .andWhere('expense.transaction_date >= :startDate', { startDate })
            .andWhere('expense.transaction_date < :endDate', { endDate })
            // BR-EXP-03 returns one ascending item for every qualifying calendar month.
            .groupBy('MONTH(expense.transaction_date)')
            .orderBy('MONTH(expense.transaction_date)', 'ASC')
            .getRawMany<ExpenseSummaryRow>();

          return rows.map((row) => this.toExpenseSummaryItem(row));
        },
      );

      return {
        success: true as const,
        message: 'Fetched successfully',
        data,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('Không thể lấy dữ liệu chi tiêu.');
    }
  }

  /** Uses the application's configured Vietnam calendar for the current-year boundary. */
  private getCurrentYear(): number {
    return Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
      }).format(new Date()),
    );
  }

  /** Converts an exact DECIMAL aggregate into the API's safe numeric representation. */
  private toExpenseSummaryItem(row: ExpenseSummaryRow): ExpenseSummaryItem {
    const monthNumber = Number(row.monthNumber);
    const totalExpense = Number(row.totalExpense);
    const month = MONTH_ABBREVIATIONS[monthNumber - 1];

    if (!month || !Number.isFinite(totalExpense)) {
      throw new InternalServerErrorException('Không thể lấy dữ liệu chi tiêu.');
    }

    return {
      month,
      totalExpense: Number(totalExpense.toFixed(2)),
    };
  }
}
