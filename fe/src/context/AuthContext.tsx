import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { authService } from '../api/auth.service'
import { normalizeApiError } from '../api/error'
import { AuthenticatedUser, User } from '../api/types'

interface AuthContextType {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (userData: AuthenticatedUser) => void
  establishSession: (accessToken: string, userData: AuthenticatedUser) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const isAuthenticatedUser = (value: unknown): value is AuthenticatedUser => {
  if (typeof value !== 'object' || value === null) return false
  const user = value as Record<string, unknown>
  return (
    typeof user.id === 'number' &&
    typeof user.fullName === 'string' &&
    typeof user.email === 'string'
  )
}

const mapLegacyUser = (user: User): AuthenticatedUser => ({
  id: user.user_id,
  fullName: user.full_name,
  email: user.email,
  username: user.username,
})

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      try {
        const userData: unknown = JSON.parse(savedUser)
        if (!isAuthenticatedUser(userData)) throw new Error('Stored user is invalid')
        setUser(userData)
      } catch (error: unknown) {
        console.error('Error parsing user data:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const establishSession = (accessToken: string, userData: AuthenticatedUser) => {
    localStorage.setItem('token', accessToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const login = async (username: string, password: string) => {
    try {
      const response = await authService.login({ username, password })
      if (response.success && response.data) {
        establishSession(response.data.token, mapLegacyUser(response.data.user))
        return
      }
      const message = Array.isArray(response.message) ? response.message[0] : response.message
      throw new Error(message || 'Đăng nhập thất bại')
    } catch (error: unknown) {
      throw new Error(normalizeApiError(error).messages[0] || 'Đăng nhập thất bại')
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const updateUser = (userData: AuthenticatedUser) => {
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
        establishSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Context and hook intentionally share one module.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
