import { AccountType } from '../account.entity';

/** Public account fields returned by the owned-account lookup. */
export interface AccountListItemDto {
  id: number;
  bank_name: string;
  account_type: AccountType;
  branch_name: string | null;
  account_number_last_4: string;
  balance: number;
}

/** Standard API envelope for the owned-account lookup. */
export interface AccountListResponseDto {
  success: true;
  message: string;
  data: {
    user_id: number;
    accounts: AccountListItemDto[];
  };
}
