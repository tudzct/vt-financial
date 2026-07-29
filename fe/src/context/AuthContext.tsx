import axios from 'axios'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../api/types'
import { authService, RegisterRequest } from '../api/auth.service'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  updateUser: (userData: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type AuthOperation = 'login' | 'register'

export type RegistrationField = 'fullName' | 'email' | 'password' | 'confirmPassword'

interface ApiErrorPayload {
  message?: string | string[]
  field?: RegistrationField
  action?: string
  code?: string
}

interface UserFacingErrorDetails {
  message: string
  field?: RegistrationField
  code?: string
}

export interface UserFacingError extends Error {
  field?: RegistrationField
  code?: string
}

const getResponseMessage = (message: string | string[] | undefined): string | undefined => {
  if (Array.isArray(message)) return message.filter(Boolean).join(' ')
  return message?.trim() || undefined
}

const isGenericHttpMessage = (message: string | undefined): boolean => {
  if (!message) return true
  return /^(bad request|request failed|internal server error|an unexpected error occurred)\.?$/i.test(message)
}

const joinMessageAndAction = (message: string, action: string | undefined): string => {
  const normalizedAction = action?.trim()
  if (!normalizedAction || message.toLowerCase().includes(normalizedAction.toLowerCase())) return message
  return `${message} ${normalizedAction}`
}

const getRequestErrorDetails = (
  error: unknown,
  operation: AuthOperation,
  fallback: string,
): UserFacingErrorDetails => {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const status = error.response?.status
    const payload = error.response?.data
    const responseMessage = getResponseMessage(payload?.message)
    const responseAction = payload?.action
    const metadata = { field: payload?.field, code: payload?.code }

    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return { message: operation === 'register'
          ? 'Registration timed out. Check your internet connection, then select Sign up again.'
          : 'Sign in timed out. Check your internet connection, then try again.' }
      }
      return { message: operation === 'register'
        ? 'Unable to reach the registration service. Check your internet connection, then select Sign up again.'
        : 'Unable to reach the sign-in service. Check your internet connection, then try again.' }
    }

    if (status === 400 || status === 422) {
      if (!isGenericHttpMessage(responseMessage)) {
        return { ...metadata, message: joinMessageAndAction(responseMessage as string, responseAction) }
      }
      return { ...metadata, message: operation === 'register'
        ? 'Some registration information is invalid. Review the highlighted fields and correct them before trying again.'
        : 'The submitted sign-in information is invalid. Check each field and try again.' }
    }

    if (status === 401) {
      return { ...metadata, message: 'The email or password is incorrect. Check both fields and try again.' }
    }

    if (status === 409) {
      const conflictMessage = !isGenericHttpMessage(responseMessage)
        ? responseMessage
        : 'An account with this email already exists.'
      return {
        field: payload?.field || (operation === 'register' ? 'email' : undefined),
        code: payload?.code,
        message: joinMessageAndAction(
          conflictMessage as string,
          responseAction || 'Use a different email address, or sign in instead.',
        ),
      }
    }

    if (status === 429) {
      return { ...metadata, message: joinMessageAndAction(
        'Too many attempts were made.',
        responseAction || 'Wait a few minutes, then try again.',
      ) }
    }

    if (status && status >= 500) {
      const normalizedResponseMessage = responseMessage?.toLowerCase() || ''
      const duplicateEmail = normalizedResponseMessage.includes('email') &&
        (normalizedResponseMessage.includes('already exists') || normalizedResponseMessage.includes('duplicate'))

      // Some proxies incorrectly preserve a 500 status for a known validation/conflict
      // response. Structured user-correctable details must win over the status code.
      if (operation === 'register' && (payload?.field || duplicateEmail) && !isGenericHttpMessage(responseMessage)) {
        return {
          field: payload?.field || (duplicateEmail ? 'email' : undefined),
          code: payload?.code || (duplicateEmail ? 'CONFLICT' : undefined),
          message: joinMessageAndAction(
            responseMessage as string,
            responseAction || (duplicateEmail
              ? 'Use a different email address, or sign in instead.'
              : 'Correct this field, then select Sign up again.'),
          ),
        }
      }

      return {
        code: payload?.code || 'SERVICE_ERROR',
        message: operation === 'register'
          ? 'No registration field was rejected. The service could not save your account right now. Keep your current entries, wait a moment, then select Sign up again.'
          : 'The sign-in service is temporarily unavailable. Your credentials do not need to be changed; wait a moment, then try again.',
      }
    }

    if (!isGenericHttpMessage(responseMessage)) {
      return { ...metadata, message: joinMessageAndAction(responseMessage as string, responseAction) }
    }
    return { ...metadata, message: fallback }
  }
  return { message: error instanceof Error ? error.message : fallback }
}

const createUserFacingError = (details: UserFacingErrorDetails): UserFacingError => {
  return Object.assign(new Error(details.message), {
    field: details.field,
    code: details.code,
  })
}

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
      throw createUserFacingError(getRequestErrorDetails(error, 'login', 'Đăng nhập thất bại. Vui lòng thử lại.'))
    }
  }

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authService.register(data)
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Registration failed. Please try again.')
      }

      const registeredUser: User = {
        user_id: response.data.user.id,
        full_name: response.data.user.fullName,
        email: response.data.user.email,
      }

      localStorage.setItem('token', response.data.accessToken)
      localStorage.setItem('user', JSON.stringify(registeredUser))
      setUser(registeredUser)
    } catch (error: unknown) {
      throw createUserFacingError(getRequestErrorDetails(error, 'register', 'Registration failed. Review your information and try again.'))
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
