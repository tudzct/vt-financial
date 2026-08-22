import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../api/types'
import { authService } from '../api/auth.service'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
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

  /** Establishes a local authenticated session from the login response. */
  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password })
      if (response.success && response.data) {
        const { user: loginUser, accessToken } = response.data
        const mappedUser: User = {
          user_id: loginUser.id,
          full_name: loginUser.fullName,
          email: loginUser.email,
          username: loginUser.email.split('@')[0],
          total_balance: 0,
        }
        localStorage.setItem('token', accessToken)
        localStorage.setItem('user', JSON.stringify(mappedUser))
        setUser(mappedUser)
      } else {
        throw new Error(response.message || 'Đăng nhập thất bại. Vui lòng thử lại.')
      }
    } catch (error: unknown) {
      const apiMessage = (error as { response?: { data?: { message?: string | string[] } } })
        .response?.data?.message
      const message = Array.isArray(apiMessage) ? apiMessage.join(' ') : apiMessage
      const localMessage = error instanceof globalThis.Error ? error.message : ''
      throw new Error(message || localMessage || 'Đăng nhập thất bại. Vui lòng thử lại.')
    }
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
