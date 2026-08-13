import axiosInstance from './axiosInstance'
import {
  ApiResponse,
  Transaction,
  TransactionFilterType,
  TransactionListResponse,
} from './types'

export const transactionService = {
  // Fetches one filtered transaction-history page.
  getTransactions: async (params: {
    type: TransactionFilterType
    limit: number
    offset: number
  }): Promise<TransactionListResponse> => {
    const response = await axiosInstance.get('/v1/transactions', { params })
    return response.data
  },

  // Fetches one transaction by identifier.
  getTransaction: async (transactionId: number): Promise<ApiResponse<Transaction>> => {
    const response = await axiosInstance.get(`/transactions/${transactionId}`)
    return response.data
  },

  // Creates a transaction.
  createTransaction: async (data: Omit<Transaction, 'transaction_id'>): Promise<ApiResponse<Transaction>> => {
    const response = await axiosInstance.post('/transactions', data)
    return response.data
  },

  // Updates a transaction.
  updateTransaction: async (transactionId: number, data: Partial<Transaction>): Promise<ApiResponse<Transaction>> => {
    const response = await axiosInstance.put(`/transactions/${transactionId}`, data)
    return response.data
  },

  // Deletes a transaction.
  deleteTransaction: async (transactionId: number): Promise<ApiResponse<void>> => {
    const response = await axiosInstance.delete(`/transactions/${transactionId}`)
    return response.data
  },
}
