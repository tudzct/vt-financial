// Định nghĩa các type cho API response

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  username: string;
  phone_number?: string;
  profile_picture_url?: string;
  total_balance: number;
}

export interface Account {
  id?: number;
  account_id: number;
  user_id: number;
  bank_name: string;
  account_type: "Checking" | "Credit Card" | "Savings" | "Investment" | "Loan";
  branch_name?: string;
  account_number_full?: string;
  account_number_last_4?: string;
  balance: number;
}

export type AccountType = "Checking" | "Credit Card" | "Savings" | "Investment" | "Loan";

/** Public account fields returned by GET /api/v1/accounts. */
export interface AccountListItem {
  id: number;
  bank_name: string;
  account_type: AccountType;
  branch_name: string | null;
  account_number_last_4: string;
  balance: number;
}

/** Authenticated owner and their ordered account list. */
export interface AccountListData {
  user_id: number;
  accounts: AccountListItem[];
}

export interface AccountListResponse {
  success: boolean;
  message: string;
  data: AccountListData;
}

/** Recent transaction returned with an account-detail lookup. */
export interface AccountDetailTransaction {
  date: string;
  amount: number;
  description: string;
  status: 'Complete' | 'Pending' | 'Failed';
  receipt_id: string | null;
  type: 'Revenue' | 'Expense';
}

/** Owned account fields returned by GET /api/v1/accounts/:id. */
export interface AccountDetail {
  id: number;
  bank_name: string;
  account_type: AccountType;
  branch_name: string | null;
  account_number_full: string;
  balance: number;
  recent_transactions: AccountDetailTransaction[];
}

export interface AccountDetailResponse {
  success: true;
  message: 'OK';
  data: AccountDetail;
}

/** Payload accepted by POST /api/v1/accounts. */
export interface CreateAccountPayload {
  bank_name: string;
  account_type: AccountType;
  branch_name?: string;
  account_number_full: string;
  balance: number;
}

/** Sensitive-number-safe account returned after creation. */
export interface CreatedAccount {
  id: number;
  user_id: number;
  bank_name: string;
  account_type: AccountType;
  branch_name: string | null;
  account_number_last_4: string;
  balance: number;
}

export interface CreateAccountResponse {
  success: true;
  message: 'Account created successfully';
  data: {
    account: CreatedAccount;
  };
}

/** Full replacement payload accepted by PUT /api/v1/accounts/:id. */
export interface UpdateAccountPayload {
  bank_name: string;
  account_type: AccountType;
  branch_name: string | null;
  account_number_full: string;
  balance: number;
}

/** Updated account returned by API-ACCOUNT-UPDATE. */
export interface UpdatedAccount {
  account_id: number;
  user_id: number;
  bank_name: string;
  account_type: AccountType;
  branch_name: string | null;
  account_number_full: string;
  account_number_last_4: string;
  balance: number;
}

export interface UpdateAccountResponse {
  message: 'Account updated successfully';
  account: UpdatedAccount;
}

/** Successful response returned by API-ACCOUNT-DELETE. */
export interface DeleteAccountResponse {
  message: 'Account deleted successfully';
  deleted_account_id: number;
}

export interface Category {
  category_id: number;
  category_name: string;
}

export interface Transaction {
  transaction_id: number;
  account_id: number;
  transaction_date: string;
  type: "Revenue" | "Expense";
  item_description: string;
  shop_name?: string;
  amount: number;
  payment_method?: string;
  status: "Complete" | "Pending" | "Failed";
  receipt_id?: string;
  category_id?: number;
}

export type TransactionFilterType = 'All' | 'Revenue' | 'Expense';

export interface TransactionListResponse {
  data: Transaction[];
  total: number;
  hasMore: boolean;
}

export interface CreateTransactionPayload {
  accountId: number;
  transactionDate: string;
  type: 'Revenue' | 'Expense';
  itemDescription: string;
  category_id?: number;
  shopName: string;
  amount: number;
  paymentMethod: string;
  status: 'Complete';
}

export interface CreatedTransaction {
  transactionId: number;
  accountId: number;
  transactionDate: string;
  type: 'Revenue' | 'Expense';
  itemDescription: string;
  shopName: string;
  amount: number;
  paymentMethod: string;
  status: 'Complete' | 'Pending' | 'Failed';
  receiptId: string | null;
  createdAt: string;
  category_id: number | null;
}

export interface CreateTransactionResponse {
  message: string;
  data: CreatedTransaction;
}

/** Normalized bill returned by GET /api/v1/bills. */
export interface BillDto {
  billId: number;
  userId: number;
  dueDate: string;
  logoUrl: string | null;
  itemDescription: string;
  lastChargeDate: string | null;
  amount: number;
}

export interface BillListResponse {
  success: boolean;
  message: string;
  data: BillDto[];
}

/** Legacy bill shape used by the existing non-list bill client methods. */
export interface Bill {
  bill_id: number;
  user_id: number;
  due_date: string;
  logo_url?: string;
  item_description: string;
  last_charge_date?: string;
  amount: number;
}

export interface Goal {
  goal_id: number;
  user_id: number;
  goal_type: "Saving" | "Expense_Limit";
  category_id: number;
  start_date: string;
  end_date: string;
  target_amount: number;
  target_achieved: boolean;
  last_updated: string;
}

/** Saving goal returned by GET /api/v1/goals. */
export interface SavingGoal {
  goal_id: number;
  goal_type: 'Saving';
  target_amount: number;
  target_achieved: number;
  start_date: string;
  end_date: string;
}

/** Active expense-limit goal returned by GET /api/v1/goals. */
export interface ExpenseGoal {
  goal_id: number;
  category: string;
  target_amount: number;
  current_expense: number;
}

export interface GoalListData {
  savingGoal: SavingGoal | null;
  expenseGoals: ExpenseGoal[];
}

export interface GoalListResponse {
  success: boolean;
  message: string;
  data: GoalListData;
}

export type GoalType = 'Saving' | 'Expense_Limit';

/** Payload accepted by POST /api/v1/goals. */
export interface CreateGoalPayload {
  goal_type: GoalType;
  category_id: number | null;
  start_date: string;
  end_date: string;
  target_amount: number;
}

/** Identifier returned after a goal is persisted. */
export interface CreatedGoalData {
  goal_id: number;
}

export type CreateGoalResponse = ApiResponse<CreatedGoalData>;

/** Target-only payload accepted by PUT /api/v1/goals/:goalId. */
export interface UpdateGoalPayload {
  target_amount: number;
}

export interface UpdatedGoalData {
  goal_id: number;
  target_amount: number;
}

export interface UpdateGoalResponse {
  success: true;
  message: 'Goal updated successfully';
  data: {
    updated_goal: UpdatedGoalData;
  };
}

/** One ordered monthly value returned by API-SAVINGS-SUMMARY. */
export interface MonthlySavings {
  month: string;
  amount: number;
}

/** Successful response returned by GET /api/v1/savings/summary. */
export interface SavingsSummaryResponse {
  user_id: number;
  year: number;
  summary: {
    this_year: MonthlySavings[];
    last_year: MonthlySavings[];
  };
}
