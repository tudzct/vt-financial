import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Account } from '../account/account.entity';
import { Category } from '../category/category.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import {
  TransactionFilterType,
  TransactionListQueryDto,
} from './dto/transaction-list-query.dto';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './transaction.entity';

interface TransactionListItem {
  transaction_id: number;
  account_id: number;
  transaction_date: string;
  type: TransactionType;
  item_description: string;
  shop_name: string;
  amount: number;
  payment_method: string;
  status: TransactionStatus;
}

export interface TransactionListResponse {
  success: true;
  message: 'Fetched successfully';
  data: TransactionListItem[];
  total: number;
  hasMore: boolean;
}

interface CreatedTransactionData {
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
}

export interface CreateTransactionResponse {
  success: true;
  message: 'Transaction created successfully';
  data: CreatedTransactionData;
}

/** Handles transaction retrieval and authenticated ownership rules. */
@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) {}

  /** Creates one transaction while holding a write lock on its account. */
  async create(
    userId: number,
    dto: CreateTransactionDto,
  ): Promise<CreateTransactionResponse> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const account = await queryRunner.manager
        .getRepository(Account)
        .createQueryBuilder('account')
        .setLock('pessimistic_write')
        .where('account.accountId = :accountId', { accountId: dto.accountId })
        .andWhere('account.userId = :userId', { userId })
        .getOne();

      if (!account) {
        throw new BadRequestException('Invalid or missing transaction data');
      }

      const categoryId = dto.category_id ?? null;
      if (categoryId !== null) {
        const category = await queryRunner.manager
          .getRepository(Category)
          .createQueryBuilder('category')
          .setLock('pessimistic_read')
          .where('category.categoryId = :categoryId', { categoryId })
          .getOne();

        if (!category) {
          throw new BadRequestException('Invalid or missing transaction data');
        }
      }

      const amount = this.normalizeMoney(dto.amount);
      const currentBalance = this.normalizeMoney(Number(account.balance));
      if (
        dto.type === TransactionType.EXPENSE &&
        currentBalance < amount
      ) {
        throw new BadRequestException('Invalid or missing transaction data');
      }

      account.balance =
        dto.type === TransactionType.REVENUE
          ? this.normalizeMoney(currentBalance + amount)
          : this.normalizeMoney(currentBalance - amount);

      const transaction = queryRunner.manager.create(Transaction, {
        accountId: dto.accountId,
        transactionDate: dto.transactionDate,
        type: dto.type,
        itemDescription: dto.itemDescription,
        shopName: dto.shopName,
        amount,
        paymentMethod: dto.paymentMethod,
        status: dto.status ?? TransactionStatus.COMPLETE,
        receiptId: null,
        categoryId,
      });

      const savedTransaction = await queryRunner.manager.save(transaction);
      await queryRunner.manager.save(account);
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Transaction created successfully',
        data: {
          transactionId: savedTransaction.transactionId,
          accountId: savedTransaction.accountId,
          transactionDate: this.formatDate(savedTransaction.transactionDate),
          type: savedTransaction.type,
          itemDescription: savedTransaction.itemDescription,
          shopName: savedTransaction.shopName,
          amount: Number(savedTransaction.amount),
          paymentMethod: savedTransaction.paymentMethod,
          status: savedTransaction.status,
          receiptId: savedTransaction.receiptId,
          createdAt: new Date().toISOString(),
          category_id: savedTransaction.categoryId,
        },
      };
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        try {
          await queryRunner.rollbackTransaction();
        } catch {
          throw new InternalServerErrorException(
            'Đã xảy ra lỗi hệ thống khi tạo giao dịch. Vui lòng thử lại sau.',
          );
        }
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Đã xảy ra lỗi hệ thống khi tạo giao dịch. Vui lòng thử lại sau.',
      );
    } finally {
      if (!queryRunner.isReleased) {
        try {
          await queryRunner.release();
        } catch {
          // Preserve the operation response; the connection pool handles cleanup.
        }
      }
    }
  }

  /** Returns one read-only page of transactions owned by the given user. */
  async findAllByUserId(
    userId: number,
    query: TransactionListQueryDto,
  ): Promise<TransactionListResponse> {
    try {
      const queryBuilder = this.transactionRepository
        .createQueryBuilder('transaction')
        .innerJoin('transaction.account', 'account')
        .where('account.userId = :userId', { userId })
        .orderBy('transaction.transactionDate', 'DESC')
        .addOrderBy('transaction.transactionId', 'DESC')
        .skip(query.offset)
        .take(query.limit);

      if (query.type !== TransactionFilterType.ALL) {
        queryBuilder.andWhere('transaction.type = :type', {
          type: query.type,
        });
      }

      const [transactions, total] = await queryBuilder.getManyAndCount();
      const data = transactions.map((transaction) =>
        this.toListItem(transaction),
      );

      return {
        success: true,
        message: 'Fetched successfully',
        data,
        total,
        hasMore: query.offset + data.length < total,
      };
    } catch {
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi hệ thống khi lấy danh sách giao dịch. Vui lòng thử lại sau.',
      );
    }
  }

  /** Maps a persisted entity without exposing relationships or sensitive fields. */
  private toListItem(transaction: Transaction): TransactionListItem {
    return {
      transaction_id: transaction.transactionId,
      account_id: transaction.accountId,
      transaction_date: this.formatDate(transaction.transactionDate),
      type: transaction.type,
      item_description: transaction.itemDescription,
      shop_name: transaction.shopName,
      amount: Number(transaction.amount),
      payment_method: transaction.paymentMethod,
      status: transaction.status,
    };
  }

  /** Preserves a database DATE value without applying a UTC date shift. */
  private formatDate(value: Date | string): string {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Rounds monetary input to the database's two-decimal precision. */
  private normalizeMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
