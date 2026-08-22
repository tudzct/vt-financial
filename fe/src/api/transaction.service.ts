import axiosInstance from './axiosInstance'
import {
  ApiResponse,
  Transaction,
  TransactionFilterType,
  TransactionListResponse,
} from './types'

export const transactionService = {
  // Lấy danh sách giao dịch có phân trang của người dùng hiện tại
  getTransactions: async (params: {
    type: TransactionFilterType
    limit: number
    offset: number
  }): Promise<TransactionListResponse> => {
    const response = await axiosInstance.get('/v1/transactions', { params })
    return response.data
  },

  // Lấy chi tiết một giao dịch
  getTransaction: async (transactionId: number): Promise<ApiResponse<Transaction>> => {
    const response = await axiosInstance.get(`/transactions/${transactionId}`)
    return response.data
  },

  // Tạo giao dịch mới
  createTransaction: async (data: Omit<Transaction, 'transaction_id'>): Promise<ApiResponse<Transaction>> => {
    const response = await axiosInstance.post('/transactions', data)
    return response.data
  },

  // Cập nhật giao dịch
  updateTransaction: async (transactionId: number, data: Partial<Transaction>): Promise<ApiResponse<Transaction>> => {
    const response = await axiosInstance.put(`/transactions/${transactionId}`, data)
    return response.data
  },

  // Xóa giao dịch
  deleteTransaction: async (transactionId: number): Promise<ApiResponse<void>> => {
    const response = await axiosInstance.delete(`/transactions/${transactionId}`)
    return response.data
  },
}
