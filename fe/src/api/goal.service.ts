import axiosInstance from './axiosInstance'
import { ApiResponse, Goal } from './types'

export const goalService = {
  // Lấy danh sách mục tiêu của user
  getGoals: async (): Promise<ApiResponse<Goal[]>> => {
    const response = await axiosInstance.get('/goals')
    return response.data
  },

  // Lấy chi tiết một mục tiêu
  getGoal: async (goalId: number): Promise<ApiResponse<Goal>> => {
    const response = await axiosInstance.get(`/goals/${goalId}`)
    return response.data
  },

  // Tạo mục tiêu mới
  createGoal: async (data: Omit<Goal, 'goal_id' | 'last_updated'>): Promise<ApiResponse<Goal>> => {
    const response = await axiosInstance.post('/goals', data)
    return response.data
  },

  // Cập nhật mục tiêu
  updateGoal: async (goalId: number, data: Partial<Goal>): Promise<ApiResponse<Goal>> => {
    const response = await axiosInstance.put(`/goals/${goalId}`, data)
    return response.data
  },

  // Xóa mục tiêu
  deleteGoal: async (goalId: number): Promise<ApiResponse<void>> => {
    const response = await axiosInstance.delete(`/goals/${goalId}`)
    return response.data
  },
}

