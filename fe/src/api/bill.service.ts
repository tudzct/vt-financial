import axiosInstance from './axiosInstance'
import { ApiResponse, Bill } from './types'

export const billService = {
  // Lấy danh sách hóa đơn của user
  getBills: async (): Promise<ApiResponse<Bill[]>> => {
    const response = await axiosInstance.get('/bills')
    return response.data
  },

  // Lấy chi tiết một hóa đơn
  getBill: async (billId: number): Promise<ApiResponse<Bill>> => {
    const response = await axiosInstance.get(`/bills/${billId}`)
    return response.data
  },

  // Tạo hóa đơn mới
  createBill: async (data: Omit<Bill, 'bill_id'>): Promise<ApiResponse<Bill>> => {
    const response = await axiosInstance.post('/bills', data)
    return response.data
  },

  // Cập nhật hóa đơn
  updateBill: async (billId: number, data: Partial<Bill>): Promise<ApiResponse<Bill>> => {
    const response = await axiosInstance.put(`/bills/${billId}`, data)
    return response.data
  },

  // Xóa hóa đơn
  deleteBill: async (billId: number): Promise<ApiResponse<void>> => {
    const response = await axiosInstance.delete(`/bills/${billId}`)
    return response.data
  },
}

