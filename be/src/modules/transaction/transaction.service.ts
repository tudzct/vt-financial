import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

/** Handles transaction retrieval and authenticated ownership rules. */
@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

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
}
