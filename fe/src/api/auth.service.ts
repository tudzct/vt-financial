import axiosInstance from './axiosInstance'
import { ApiResponse, User } from './types'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthenticatedUser {
  id: number
  fullName: string
  email: string
}

export interface AuthData {
  accessToken: string
  user: AuthenticatedUser
}

export type LoginData = AuthData
export type RegisterData = AuthData

export const authService = {
  /** Authenticates a user with their email address and password. */
  login: async (data: LoginRequest): Promise<ApiResponse<LoginData>> => {
    const response = await axiosInstance.post('/auth/login', data)
    return response.data
  },

  // Đăng ký
  register: async (data: RegisterRequest): Promise<ApiResponse<RegisterData>> => {
    const response = await axiosInstance.post('/auth/register', data)
    return response.data
  },

  // Đăng xuất
  logout: (): void => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  // Lấy thông tin user hiện tại
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const response = await axiosInstance.get('/auth/me')
    return response.data
  },
}
