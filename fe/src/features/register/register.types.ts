export interface RegisterFormState {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export type RegisterField = keyof RegisterFormState
export type RegisterFieldErrors = Partial<Record<RegisterField, string>>

export interface RegisteredUser {
  id: number
  fullName: string
  email: string
}

export interface RegisterRequest extends RegisterFormState {}

export interface RegisterSuccessResponse {
  success: true
  message: string
  data: {
    accessToken: string
    user: RegisteredUser
  }
}

export interface RegisterErrorResponse {
  success: false
  message: string | string[]
  error?: unknown
}
