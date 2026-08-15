import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
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
const EXPENSE_BREAKDOWN_ERROR_MESSAGE =
  'Không thể lấy dữ liệu breakdown chi tiêu.';
const NO_EXPENSE_DATA_MESSAGE = 'Không có dữ liệu chi tiêu cho tháng này.';
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

interface ExpenseBreakdownTransaction {
  transactionId: number;
  transactionDate: Date | string;
  itemDescription: string;
  amount: number;
  categoryId: number | null;
  categoryName: string | null;
}

export interface ExpenseBreakdownItem {
  category: string;
  total: number;
  changePercent: number | null;
  subCategories: Array<{
    item_description: string;
    amount: number;
    date: string;
  }>;
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

  /** Builds an owned, read-only category breakdown for one calendar month. */
  async getExpensesBreakdown(
    userId: number,
    month: string,
  ): Promise<ExpenseBreakdownItem[]> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Unauthorized');
    }

    const [yearText, monthText] = month.split('-');
    const year = Number(yearText);
    const monthNumber = Number(monthText);

    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      throw new NotFoundException(NO_EXPENSE_DATA_MESSAGE);
    }

    try {
      const accounts = await this.accountRepository.find({
        select: { accountId: true },
        where: { userId },
      });
      const accountIds = accounts.map((account) => account.accountId);

      if (accountIds.length === 0) {
        throw new NotFoundException(NO_EXPENSE_DATA_MESSAGE);
      }

      const currentStart = this.toMonthStart(year, monthNumber);
      const currentEnd = this.toMonthEnd(year, monthNumber);
      const previousYear = monthNumber === 1 ? year - 1 : year;
      const previousMonth = monthNumber === 1 ? 12 : monthNumber - 1;
      const previousStart = this.toMonthStart(previousYear, previousMonth);

      const rows = await this.transactionRepository
        .createQueryBuilder('transaction')
        .leftJoin('transaction.category', 'category')
        .select('transaction.transactionId', 'transactionId')
        .addSelect('transaction.transactionDate', 'transactionDate')
        .addSelect('transaction.itemDescription', 'itemDescription')
        .addSelect('transaction.amount', 'amount')
        .addSelect('transaction.categoryId', 'categoryId')
        .addSelect('category.categoryName', 'categoryName')
        .where({ accountId: In(accountIds) })
        .andWhere('transaction.type = :type', {
          type: TransactionType.EXPENSE,
        })
        .andWhere(
          'transaction.transactionDate BETWEEN :previousStart AND :currentEnd',
          { previousStart, currentEnd },
        )
        .orderBy('transaction.transactionDate', 'ASC')
        .addOrderBy('transaction.transactionId', 'ASC')
        .getRawMany<ExpenseBreakdownTransaction>();

      const currentRows = rows.filter((row) => {
        const date = this.toIsoDate(row.transactionDate);
        return date >= currentStart && date <= currentEnd;
      });

      if (currentRows.length === 0) {
        throw new NotFoundException(NO_EXPENSE_DATA_MESSAGE);
      }

      const previousTotals = new Map<number, number>();
      rows.forEach((row) => {
        const date = this.toIsoDate(row.transactionDate);

        if (date < currentStart) {
          const categoryKey = row.categoryId ?? 0;
          const amount = Number(row.amount);

          if (!Number.isFinite(amount)) {
            throw new Error('Invalid expense amount');
          }

          previousTotals.set(
            categoryKey,
            (previousTotals.get(categoryKey) ?? 0) + amount,
          );
        }
      });

      const groups = new Map<
        number,
        {
          category: string;
          total: number;
          subCategories: ExpenseBreakdownItem['subCategories'];
        }
      >();

      currentRows.forEach((row) => {
        const categoryKey = row.categoryId ?? 0;
        const category =
          categoryKey === 0 ? 'Uncategorized' : (row.categoryName ?? 'Unknown');
        const amount = Number(row.amount);

        if (!Number.isFinite(amount)) {
          throw new Error('Invalid expense amount');
        }

        const group = groups.get(categoryKey) ?? {
          category,
          total: 0,
          subCategories: [],
        };
        group.total += amount;
        group.subCategories.push({
          item_description: row.itemDescription,
          amount,
          date: this.toIsoDate(row.transactionDate),
        });
        groups.set(categoryKey, group);
      });

      return Array.from(groups.entries())
        .map(([categoryKey, group]) => {
          const total = this.round2(group.total);
          const previousTotal = previousTotals.get(categoryKey) ?? 0;
          const changePercent =
            previousTotal === 0
              ? total > 0
                ? 100
                : null
              : this.round2(((total - previousTotal) / previousTotal) * 100);

          return {
            category: group.category,
            total,
            changePercent,
            subCategories: group.subCategories,
          };
        })
        .sort(
          (first, second) =>
            second.total - first.total ||
            first.category.localeCompare(second.category),
        );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(EXPENSE_BREAKDOWN_ERROR_MESSAGE);
    }
  }

  /** Produces an inclusive first-day boundary in database date format. */
  private toMonthStart(year: number, month: number): string {
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
  }

  /** Produces an inclusive last-day boundary in database date format. */
  private toMonthEnd(year: number, month: number): string {
    const daysByMonth = [
      31,
      year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0) ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ];
    const day = daysByMonth[month - 1];
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  /** Normalizes ORM date values without applying the server timezone. */
  private toIsoDate(value: Date | string): string {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }

    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }

  /** Rounds a monetary or percentage result to two decimal places. */
  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
