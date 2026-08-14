import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Account } from '../account/account.entity';
import { Category } from '../category/category.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './transaction.entity';
import { TransactionFilterType } from './dto/transaction-list-query.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';

const CREATE_ERROR_MESSAGE = 'Invalid or missing transaction data';
const CREATE_SYSTEM_ERROR_MESSAGE =
  'Đã xảy ra lỗi hệ thống khi tạo giao dịch. Vui lòng thử lại sau.';

export interface CreateTransactionResult {
  message: string;
  data: {
    transactionId: number;
    accountId: number;
    transactionDate: string;
    type: TransactionType;
    itemDescription: string;
    shopName: string;
    amount: number;
    paymentMethod: string;
    status: TransactionStatus;
    receiptId: string | null;
    createdAt: string;
    category_id: number | null;
  };
}

export interface TransactionListItem {
  transaction_id: number;
  account_id: number;
  transaction_date: string;
  type: TransactionType;
  item_description: string;
  shop_name: string;
  amount: number;
  payment_method: string;
  status: string;
}

export interface TransactionListResult {
  data: TransactionListItem[];
  total: number;
  hasMore: boolean;
}

/** Reads transaction history while enforcing authenticated ownership. */
@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) {}

  /** Persists one transaction and its balance adjustment in a locked unit of work. */
  async create(
    userId: number,
    dto: CreateTransactionDto,
  ): Promise<CreateTransactionResult> {
    this.validateCreateInput(userId, dto);

    const itemDescription = dto.itemDescription.trim();
    const shopName = dto.shopName.trim();
    const paymentMethod = dto.paymentMethod.trim();
    const amount = Number(dto.amount.toFixed(2));
    const status = dto.status ?? TransactionStatus.COMPLETE;
    const categoryId = dto.category_id ?? null;

    try {
      return await this.dataSource.transaction(async (manager) => {
        const account = await manager
          .getRepository(Account)
          .createQueryBuilder('account')
          .setLock('pessimistic_write')
          .where('account.accountId = :accountId', { accountId: dto.accountId })
          .andWhere('account.userId = :userId', { userId })
          .getOne();

        if (!account) {
          throw new BadRequestException(CREATE_ERROR_MESSAGE);
        }

        if (categoryId !== null) {
          const categoryExists = await manager
            .getRepository(Category)
            .exists({ where: { categoryId } });

          if (!categoryExists) {
            throw new BadRequestException(CREATE_ERROR_MESSAGE);
          }
        }

        const currentBalance = Number(account.balance);
        if (
          dto.type === TransactionType.EXPENSE &&
          currentBalance < amount
        ) {
          throw new BadRequestException(CREATE_ERROR_MESSAGE);
        }

        account.balance = Number(
          (dto.type === TransactionType.REVENUE
            ? currentBalance + amount
            : currentBalance - amount
          ).toFixed(2),
        );

        const transactionRepository = manager.getRepository(Transaction);
        const transaction = transactionRepository.create({
          accountId: dto.accountId,
          transactionDate: this.toUtcDate(dto.transactionDate),
          type: dto.type,
          itemDescription,
          categoryId,
          shopName,
          amount,
          paymentMethod,
          status,
          receiptId: null,
        });

        const savedTransaction = await transactionRepository.save(transaction);
        await manager.getRepository(Account).save(account);

        return {
          message: 'Transaction created successfully',
          data: {
            transactionId: savedTransaction.transactionId,
            accountId: savedTransaction.accountId,
            transactionDate: this.toIsoDateTime(savedTransaction.transactionDate),
            type: savedTransaction.type,
            itemDescription: savedTransaction.itemDescription,
            shopName: savedTransaction.shopName,
            amount: Number(savedTransaction.amount),
            paymentMethod: savedTransaction.paymentMethod,
            status: savedTransaction.status,
            receiptId: savedTransaction.receiptId ?? null,
            createdAt: new Date().toISOString(),
            category_id: savedTransaction.categoryId ?? null,
          },
        };
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(CREATE_SYSTEM_ERROR_MESSAGE);
    }
  }

  /** Returns one ordered, filtered page of transactions for a user. */
  async findAllByUserId(
    userId: number,
    type: TransactionFilterType,
    limit: number,
    offset: number,
  ): Promise<TransactionListResult> {
    this.validateQuery(type, limit, offset);

    try {
      const accounts = await this.accountRepository.find({
        select: { accountId: true },
        where: { userId },
      });
      const accountIds = accounts.map((account) => account.accountId);

      if (accountIds.length === 0) {
        return { data: [], total: 0, hasMore: false };
      }

      const query = this.transactionRepository
        .createQueryBuilder('transaction')
        .where({ accountId: In(accountIds) })
        .orderBy('transaction.transactionDate', 'DESC')
        .addOrderBy('transaction.transactionId', 'DESC')
        .skip(offset)
        .take(limit);

      if (type !== TransactionFilterType.ALL) {
        query.andWhere('transaction.type = :type', { type });
      }

      const [transactions, total] = await query.getManyAndCount();
      const data = transactions.map((transaction) => this.mapTransaction(transaction));

      return {
        data,
        total,
        hasMore: offset + data.length < total,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Đã xảy ra lỗi hệ thống khi lấy danh sách giao dịch. Vui lòng thử lại sau.',
      );
    }
  }

  /** Rejects invalid filter and pagination values at the service boundary. */
  private validateQuery(
    type: TransactionFilterType,
    limit: number,
    offset: number,
  ): void {
    if (
      !Object.values(TransactionFilterType).includes(type) ||
      !Number.isInteger(limit) ||
      limit <= 0 ||
      !Number.isInteger(offset) ||
      offset < 0
    ) {
      throw new BadRequestException('Invalid transaction query parameter');
    }
  }

  /** Enforces UC-04 invariants again at the service boundary. */
  private validateCreateInput(userId: number, dto: CreateTransactionDto): void {
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dto.transactionDate) &&
      this.toUtcDate(dto.transactionDate).toISOString().slice(0, 10) === dto.transactionDate;

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !Number.isInteger(dto.accountId) ||
      dto.accountId <= 0 ||
      !isValidDate ||
      !Object.values(TransactionType).includes(dto.type) ||
      (dto.status !== undefined &&
        !Object.values(TransactionStatus).includes(dto.status)) ||
      !dto.itemDescription?.trim() ||
      !dto.shopName?.trim() ||
      !dto.paymentMethod?.trim() ||
      !Number.isFinite(dto.amount) ||
      dto.amount < 0.01 ||
      (dto.category_id !== undefined &&
        dto.category_id !== null &&
        (!Number.isInteger(dto.category_id) || dto.category_id <= 0))
    ) {
      throw new BadRequestException(CREATE_ERROR_MESSAGE);
    }
  }

  /** Parses a date-only value at UTC midnight without a timezone shift. */
  private toUtcDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  /** Serializes a TypeORM date value as an ISO UTC timestamp. */
  private toIsoDateTime(value: Date | string): string {
    const dateOnly = value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value).slice(0, 10);
    return `${dateOnly}T00:00:00.000Z`;
  }

  /** Maps persisted fields to the public snake_case response contract. */
  private mapTransaction(transaction: Transaction): TransactionListItem {
    const transactionDate =
      transaction.transactionDate instanceof Date
        ? [
            transaction.transactionDate.getFullYear(),
            String(transaction.transactionDate.getMonth() + 1).padStart(2, '0'),
            String(transaction.transactionDate.getDate()).padStart(2, '0'),
          ].join('-')
        : String(transaction.transactionDate).slice(0, 10);

    return {
      transaction_id: transaction.transactionId,
      account_id: transaction.accountId,
      transaction_date: transactionDate,
      type: transaction.type,
      item_description: transaction.itemDescription,
      shop_name: transaction.shopName,
      amount: Number(transaction.amount),
      payment_method: transaction.paymentMethod,
      status: transaction.status,
    };
  }
}
