import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Account } from '../account/account.entity';
import { Category } from '../category/category.entity';
import {
  Transaction,
  TransactionType,
} from '../transaction/transaction.entity';
import { GoalListDataDto } from './dto/goal-list.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { Goal, GoalType } from './goal.entity';

const GOAL_RETRIEVAL_ERROR_MESSAGE =
  'Đã xảy ra lỗi hệ thống khi tải mục tiêu, vui lòng thử lại sau.';
const GOAL_CREATION_ERROR_MESSAGE =
  'Không thể tạo mục tiêu lúc này. Vui lòng thử lại sau.';
const APPLICATION_TIME_ZONE = 'Asia/Ho_Chi_Minh';

interface ProgressRow {
  type: TransactionType;
  categoryId: string | null;
  totalAmount: string;
}

/** Creates owned goals and calculates their current-month progress. */
@Injectable()
export class GoalService {
  constructor(private readonly dataSource: DataSource) {}

  /** Implements UC-14 and BR-GOAL-04 through BR-GOAL-11 atomically. */
  async createGoal(userId: number, dto: CreateGoalDto): Promise<Goal> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (!Object.values(GoalType).includes(dto.goal_type)) {
      throw new BadRequestException(
        'goal_type must be either Saving or Expense_Limit',
      );
    }

    if (
      typeof dto.target_amount !== 'number' ||
      !Number.isFinite(dto.target_amount) ||
      dto.target_amount <= 0
    ) {
      throw new BadRequestException('target_amount must be greater than 0');
    }

    const startDate = this.parseCalendarDate(dto.start_date, 'start_date');
    const endDate = this.parseCalendarDate(dto.end_date, 'end_date');

    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('end_date must be later than start_date');
    }

    const targetAmount = this.normalizeMoney(dto.target_amount);

    if (targetAmount <= 0) {
      throw new BadRequestException('target_amount must be greater than 0');
    }

    try {
      return await this.dataSource.transaction(
        'READ COMMITTED',
        async (manager) => {
          const goalRepository = manager.getRepository(Goal);
          let categoryId: number | null = null;

          if (dto.goal_type === GoalType.EXPENSE_LIMIT) {
            if (
              !Number.isInteger(dto.category_id) ||
              Number(dto.category_id) <= 0
            ) {
              throw new BadRequestException(
                'category_id is required for Expense_Limit goals',
              );
            }

            const category = await manager.getRepository(Category).findOne({
              select: { categoryId: true },
              where: { categoryId: Number(dto.category_id) },
            });

            if (!category) {
              throw new BadRequestException('Selected category does not exist');
            }

            categoryId = category.categoryId;
          }

          const goal = goalRepository.create({
            userId,
            goalType: dto.goal_type,
            categoryId,
            startDate: dto.start_date,
            endDate: dto.end_date,
            targetAmount,
          });
          const savedGoal = await goalRepository.save(goal);

          if (!Number.isInteger(savedGoal.goalId) || savedGoal.goalId <= 0) {
            throw new Error('Goal persistence did not return an identifier');
          }

          return savedGoal;
        },
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(GOAL_CREATION_ERROR_MESSAGE);
    }
  }

  /** Implements UC-13 and BR-GOAL-01 through BR-GOAL-03. */
  async getGoals(userId: number): Promise<GoalListDataDto> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Unauthorized');
    }

    try {
      const { startDate, endDate } = this.getCurrentMonthRange();

      return await this.dataSource.transaction(
        'REPEATABLE READ',
        async (manager) => {
          const goalRepository = manager.getRepository(Goal);
          const accountRepository = manager.getRepository(Account);
          const transactionRepository = manager.getRepository(Transaction);

          const savingGoal = await goalRepository.findOne({
            where: { userId, goalType: GoalType.SAVING },
            order: { goalId: 'ASC' },
          });
          const expenseGoals = await goalRepository
            .createQueryBuilder('goal')
            .leftJoinAndSelect('goal.category', 'category')
            .where('goal.userId = :userId', { userId })
            .andWhere('goal.goalType = :goalType', {
              goalType: GoalType.EXPENSE_LIMIT,
            })
            .andWhere('goal.startDate <= :endDate', { endDate })
            .andWhere('goal.endDate >= :startDate', { startDate })
            .orderBy('goal.goalId', 'ASC')
            .getMany();
          const accounts = await accountRepository.find({
            select: { accountId: true },
            where: { userId },
          });

          const accountIds = accounts.map((account) => account.accountId);
          const progressRows =
            accountIds.length === 0
              ? []
              : await transactionRepository
                  .createQueryBuilder('transaction')
                  .select('transaction.type', 'type')
                  .addSelect('transaction.categoryId', 'categoryId')
                  .addSelect(
                    'COALESCE(SUM(transaction.amount), 0)',
                    'totalAmount',
                  )
                  .where('transaction.accountId IN (:...accountIds)', {
                    accountIds,
                  })
                  .andWhere(
                    'transaction.transactionDate BETWEEN :startDate AND :endDate',
                    { startDate, endDate },
                  )
                  .groupBy('transaction.type')
                  .addGroupBy('transaction.categoryId')
                  .getRawMany<ProgressRow>();

          let totalRevenue = 0;
          let totalExpense = 0;
          const expenseByCategory = new Map<number, number>();

          progressRows.forEach((row) => {
            const amount = this.normalizeMoney(row.totalAmount);

            if (row.type === TransactionType.REVENUE) {
              totalRevenue = this.normalizeMoney(totalRevenue + amount);
              return;
            }

            if (row.type === TransactionType.EXPENSE) {
              totalExpense = this.normalizeMoney(totalExpense + amount);

              if (row.categoryId !== null) {
                const categoryId = Number(row.categoryId);

                if (!Number.isInteger(categoryId) || categoryId <= 0) {
                  throw new Error('Invalid category aggregation result');
                }

                expenseByCategory.set(categoryId, amount);
              }
            }
          });

          return {
            savingGoal: savingGoal
              ? {
                  goal_id: savingGoal.goalId,
                  goal_type: 'Saving',
                  target_amount: this.normalizeMoney(savingGoal.targetAmount),
                  target_achieved: this.normalizeMoney(
                    totalRevenue - totalExpense,
                  ),
                  start_date: this.toIsoDate(savingGoal.startDate),
                  end_date: this.toIsoDate(savingGoal.endDate),
                }
              : null,
            expenseGoals: expenseGoals.map((goal) => ({
              goal_id: goal.goalId,
              category: goal.category?.categoryName ?? 'Unknown',
              target_amount: this.normalizeMoney(goal.targetAmount),
              current_expense: this.normalizeMoney(
                goal.categoryId === null
                  ? 0
                  : (expenseByCategory.get(goal.categoryId) ?? 0),
              ),
            })),
          };
        },
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException(GOAL_RETRIEVAL_ERROR_MESSAGE);
    }
  }

  /** Returns current-month date boundaries in the application timezone. */
  private getCurrentMonthRange(now = new Date()): {
    startDate: string;
    endDate: string;
  } {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: APPLICATION_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(now);
    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value);

    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      throw new Error('Unable to resolve current month');
    }

    const monthText = String(month).padStart(2, '0');
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

    return {
      startDate: `${year}-${monthText}-01`,
      endDate: `${year}-${monthText}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  /** Normalizes persisted decimal values to the schema's two-decimal scale. */
  private normalizeMoney(value: number | string): number {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      throw new Error('Invalid monetary value');
    }

    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  /** Parses a strict calendar date without applying a local timezone offset. */
  private parseCalendarDate(value: string, fieldName: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${fieldName} must use YYYY-MM-DD format`);
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return date;
  }

  /** Formats an ORM date without leaking server timezone offsets. */
  private toIsoDate(value: Date | string): string {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid goal date');
    }

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: APPLICATION_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new Error('Unable to format goal date');
    }

    return `${year}-${month}-${day}`;
  }
}
