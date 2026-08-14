import axiosInstance from './axiosInstance'
import { ApiResponse, User } from './types'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginUser {
  id: number
  fullName: string
  email: string
}

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export type RegisterData = { accessToken: string; user: LoginUser }

export interface RegisterResponse {
  success: boolean
  message: string | string[]
  data?: RegisterData
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
  /** Authenticates an existing user. */
  login: async (
    data: LoginRequest
  ): Promise<ApiResponse<{ accessToken: string; user: LoginUser }>> => {
    const response = await axiosInstance.post('/auth/login', data)
    return response.data
  },

  /** Registers a user and returns an authenticated session. */
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await axiosInstance.post('/auth/register', data)
    return response.data
  },

  /** Clears the locally persisted authenticated session. */
  logout: (): void => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  /** Retrieves the currently authenticated user. */
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const response = await axiosInstance.get('/auth/me')
    return response.data
  },
}
