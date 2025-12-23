import axiosInstance from './axiosInstance'
import { ApiResponse, User } from './types'

export const userService = {
  // Lấy thông tin user
  getUser: async (userId: number): Promise<ApiResponse<User>> => {
    const response = await axiosInstance.get(`/users/${userId}`)
    return response.data
  },

  // Cập nhật thông tin user
  updateUser: async (userId: number, data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await axiosInstance.put(`/users/${userId}`, data)
    return response.data
  },
}

