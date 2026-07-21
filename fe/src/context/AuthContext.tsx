import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'
import { User } from '../api/types'
import { authService, RegisterRequest } from '../api/auth.service'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (data: RegisterRequest) => Promise<string>
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
        throw new Error(response.message || 'Đăng nhập thất bại')
      }
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : error instanceof Error
          ? error.message
          : undefined
      throw new Error(typeof message === 'string' ? message : 'Đăng nhập thất bại')
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const register = async (registration: RegisterRequest) => {
    const response = await authService.register(registration)
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Registration failed. Please try again.')
    }

    const { accessToken, user: registeredUser } = response.data
    const mappedUser: User = {
      id: registeredUser.id,
      fullName: registeredUser.fullName,
      email: registeredUser.email,
    }

    localStorage.setItem('token', accessToken)
    localStorage.setItem('user', JSON.stringify(mappedUser))
    setUser(mappedUser)

    return response.message
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

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
