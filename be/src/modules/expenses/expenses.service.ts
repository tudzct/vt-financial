import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Account } from '../account/account.entity';
import {
  Transaction,
  TransactionType,
} from '../transaction/transaction.entity';

const EXPENSE_SUMMARY_ERROR_MESSAGE = 'Không thể lấy dữ liệu chi tiêu.';
const MONTH_NAMES = [
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

interface ExpenseSummaryRow {
  monthNumber: string;
  totalExpense: string;
}

export interface ExpenseSummaryItem {
  month: (typeof MONTH_NAMES)[number];
  totalExpense: number;
}

/** Aggregates expense data while enforcing authenticated account ownership. */
@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  /** Returns sparse current-year expense totals in chronological order. */
  async getExpenseSummary(userId: number): Promise<ExpenseSummaryItem[]> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Unauthorized');
    }

    try {
      const accounts = await this.accountRepository.find({
        select: { accountId: true },
        where: { userId },
      });
      const accountIds = accounts.map((account) => account.accountId);

      if (accountIds.length === 0) {
        return [];
      }

      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      const rows = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('MONTH(transaction.transactionDate)', 'monthNumber')
        .addSelect('SUM(transaction.amount)', 'totalExpense')
        .where({ accountId: In(accountIds) })
        .andWhere('transaction.type = :type', {
          type: TransactionType.EXPENSE,
        })
        .andWhere(
          'transaction.transactionDate BETWEEN :startDate AND :endDate',
          { startDate, endDate },
        )
        .groupBy('MONTH(transaction.transactionDate)')
        .orderBy('MONTH(transaction.transactionDate)', 'ASC')
        .getRawMany<ExpenseSummaryRow>();

      return rows.map((row) => {
        const monthIndex = Number(row.monthNumber) - 1;
        const totalExpense = Number(row.totalExpense);

        if (
          !Number.isInteger(monthIndex) ||
          monthIndex < 0 ||
          monthIndex >= MONTH_NAMES.length ||
          !Number.isFinite(totalExpense)
        ) {
          throw new Error('Invalid expense aggregation result');
        }

        return {
          month: MONTH_NAMES[monthIndex],
          totalExpense,
        };
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException(EXPENSE_SUMMARY_ERROR_MESSAGE);
    }
  }
}
