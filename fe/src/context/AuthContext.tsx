import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AxiosError } from 'axios'
import { User } from '../api/types'
import { authService, RegisterRequest } from '../api/auth.service'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (data: RegisterRequest) => Promise<User>
  logout: () => void
  updateUser: (userData: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Kiểm tra token khi component mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        // Có thể gọi API để verify token và lấy user mới nhất
      } catch (error) {
        console.error('Error parsing user data:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const response = await authService.login({ username, password })
      if (response.success && response.data) {
        const { user: userData, token } = response.data
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
      } else {
        const message = Array.isArray(response.message)
          ? response.message.join(', ')
          : response.message
        throw new Error(message || 'Đăng nhập thất bại')
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{
        message?: string | string[]
      }>
      const responseMessage = axiosError.response?.data?.message
      const message = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : responseMessage
      throw new Error(message || 'Đăng nhập thất bại')
    }
  }

  // Thiết lập phiên đăng nhập từ response đăng ký chuẩn của UC-01.
  const register = async (data: RegisterRequest): Promise<User> => {
    const response = await authService.register(data)

    if (!response.success || !response.data) {
      const message = Array.isArray(response.message)
        ? response.message.join(', ')
        : response.message
      throw new Error(message || 'Đăng ký thất bại. Vui lòng thử lại.')
    }

    const mappedUser: User = {
      user_id: response.data.user.id,
      full_name: response.data.user.fullName,
      email: response.data.user.email,
      username: response.data.user.email,
      total_balance: 0,
    }

    localStorage.setItem('token', response.data.accessToken)
    localStorage.setItem('user', JSON.stringify(mappedUser))
    setUser(mappedUser)

    return mappedUser
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const updateUser = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
