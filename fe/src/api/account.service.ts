import axiosInstance from './axiosInstance'
import { Account, AccountListResponse, ApiResponse } from './types'

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

  // Tạo tài khoản mới
  createAccount: async (data: Omit<Account, 'account_id'>): Promise<ApiResponse<Account>> => {
    const response = await axiosInstance.post('/accounts', data)
    return response.data
  },

  // Cập nhật tài khoản
  updateAccount: async (accountId: number, data: Partial<Account>): Promise<ApiResponse<Account>> => {
    const response = await axiosInstance.put(`/accounts/${accountId}`, data)
    return response.data
  },

  // Xóa tài khoản
  deleteAccount: async (accountId: number): Promise<ApiResponse<void>> => {
    const response = await axiosInstance.delete(`/accounts/${accountId}`)
    return response.data
  },
}

