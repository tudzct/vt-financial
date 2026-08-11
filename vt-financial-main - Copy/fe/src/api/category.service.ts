import axiosInstance from './axiosInstance'
import { ApiResponse, Category } from './types'

export const categoryService = {
  // Lấy danh sách tất cả categories
  getCategories: async (): Promise<ApiResponse<Category[]>> => {
    const response = await axiosInstance.get('/categories')
    return response.data
  },

  // Lấy chi tiết một category
  getCategory: async (categoryId: number): Promise<ApiResponse<Category>> => {
    const response = await axiosInstance.get(`/categories/${categoryId}`)
    return response.data
  },
}

