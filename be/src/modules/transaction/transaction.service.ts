import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Account } from '../account/account.entity';
import { Transaction, TransactionType } from './transaction.entity';
import { TransactionFilterType } from './dto/transaction-list-query.dto';

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
  ) {}

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
