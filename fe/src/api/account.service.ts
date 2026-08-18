import axiosInstance from './axiosInstance'
import {
  Account,
  AccountDetailResponse,
  AccountListResponse,
  ApiResponse,
  CreateAccountPayload,
  CreateAccountResponse,
  DeleteAccountResponse,
  UpdateAccountPayload,
  UpdateAccountResponse,
} from './types'

export const accountService = {
  // Loads accounts owned by the authenticated user for transaction entry.
  getOwnedAccounts: async (): Promise<Account[]> => {
    const response = await axiosInstance.get<AccountListResponse>('/v1/accounts')
    const { user_id: userId, accounts } = response.data.data

    return accounts.map((account) => ({
      ...account,
      account_id: account.id,
      user_id: userId,
      branch_name: account.branch_name ?? undefined,
    }))
  },

  /** Loads the authenticated user's account-list contract. */
  getAccountList: async (): Promise<AccountListResponse> => {
    const response = await axiosInstance.get<AccountListResponse>('/v1/accounts')
    return response.data
  },

  /** Loads one owned account and its five most recent transactions. */
  getAccountDetail: async (accountId: number): Promise<AccountDetailResponse> => {
    const response = await axiosInstance.get<AccountDetailResponse>(
      `/v1/accounts/${accountId}`
    )
    return response.data
  },

  // Loads accounts in the legacy shape used by the dashboard.
  getAccounts: async (): Promise<ApiResponse<Account[]>> => {
    const response = await axiosInstance.get<AccountListResponse>('/v1/accounts')
    const { user_id: userId, accounts } = response.data.data

    return {
      success: response.data.success,
      message: response.data.message,
      data: accounts.map((account) => ({
        ...account,
        account_id: account.id,
        user_id: userId,
        branch_name: account.branch_name ?? undefined,
      })),
    }
  },

  // Lấy chi tiết một tài khoản
  getAccount: async (accountId: number): Promise<ApiResponse<Account>> => {
    const response = await axiosInstance.get(`/accounts/${accountId}`)
    return response.data
  },

  /** Creates an account for the authenticated user. */
  createAccount: async (data: CreateAccountPayload): Promise<CreateAccountResponse> => {
    const response = await axiosInstance.post<CreateAccountResponse>(
      '/v1/accounts',
      data
    )
    return response.data
  },

  /** Replaces the editable fields of one owned account. */
  updateAccount: async (
    accountId: number,
    data: UpdateAccountPayload
  ): Promise<UpdateAccountResponse> => {
    const response = await axiosInstance.put<UpdateAccountResponse>(
      `/v1/accounts/${accountId}`,
      data
    )
    return response.data
  },

  /** Deletes one owned account and all of its related transactions. */
  deleteAccount: async (accountId: number): Promise<DeleteAccountResponse> => {
    const response = await axiosInstance.delete<DeleteAccountResponse>(
      `/v1/accounts/${accountId}`
    )
    return response.data
  },
}

