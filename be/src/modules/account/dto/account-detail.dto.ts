import { AccountType } from '../account.entity';
import {
  TransactionStatus,
  TransactionType,
} from '../../transaction/transaction.entity';

/** Transaction fields exposed by the account-detail response. */
export interface AccountDetailTransactionDto {
  date: string;
  amount: number;
  description: string;
  status: TransactionStatus;
  receipt_id: string | null;
  type: TransactionType;
}

/** Standard API envelope for one owned account and its recent activity. */
export interface AccountDetailResponseDto {
  success: true;
  message: 'OK';
  data: {
    id: number;
    bank_name: string;
    account_type: AccountType;
    branch_name: string | null;
    account_number_full: string;
    balance: number;
    recent_transactions: AccountDetailTransactionDto[];
  };
}
