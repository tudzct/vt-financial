import axiosInstance from './axiosInstance'
import { ApiResponse, User } from './types'
import {
  RegisterRequest,
  RegisterSuccessResponse,
} from '../features/register/register.types'

export interface LoginRequest {
  username: string
  password: string
}

const isRegisterSuccessResponse = (value: unknown): value is RegisterSuccessResponse => {
  if (typeof value !== 'object' || value === null) return false
  const response = value as Record<string, unknown>
  if (response.success !== true || typeof response.message !== 'string') return false
  if (typeof response.data !== 'object' || response.data === null) return false
  const data = response.data as Record<string, unknown>
  if (typeof data.accessToken !== 'string' || !data.accessToken) return false
  if (typeof data.user !== 'object' || data.user === null) return false
  const user = data.user as Record<string, unknown>
  return (
    typeof user.id === 'number' &&
    typeof user.fullName === 'string' &&
    typeof user.email === 'string'
  )
}

export const authService = {
  // Đăng nhập
  login: async (data: LoginRequest): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response = await axiosInstance.post('/auth/login', data)
    return response.data
  },

  // Đăng ký
  register: async (
    data: RegisterRequest,
    signal?: AbortSignal,
  ): Promise<RegisterSuccessResponse> => {
    const response = await axiosInstance.post<unknown>('/auth/register', data, { signal })
    if (!isRegisterSuccessResponse(response.data)) {
      throw new Error('The registration service returned an invalid response.')
    }
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
