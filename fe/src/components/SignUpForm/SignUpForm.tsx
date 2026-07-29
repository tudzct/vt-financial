import React, { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import Input from '../Input/Input'
import Button from '../Button/Button'
import { useAuth } from '../../context/AuthContext'
import {
  RegistrationFieldErrors,
  RegistrationFormState,
  validateRegistrationForm,
} from './registrationValidation'

interface ApiErrorBody {
  success: false
  message: string | string[]
  error?: string
}

const getRegistrationErrorMessages = (error: unknown): string[] => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const responseBody = error.response?.data

    if (responseBody?.message) {
      return Array.isArray(responseBody.message)
        ? responseBody.message
        : [responseBody.message]
    }

    if (responseBody?.error) {
      return [responseBody.error]
    }

    if (error.code === 'ECONNABORTED') {
      return [
        'Yêu cầu đăng ký đã quá thời gian chờ. Vui lòng kiểm tra kết nối và thử lại.',
      ]
    }

    if (!error.response) {
      return [
        'Không thể kết nối đến máy chủ đăng ký. Vui lòng kiểm tra backend đang chạy và thử lại.',
      ]
    }

    return [
      `Máy chủ trả về lỗi HTTP ${error.response.status}. Vui lòng thử lại hoặc liên hệ quản trị viên.`,
    ]
  }

  if (error instanceof Error && error.message) {
    return [error.message]
  }

  return ['Đăng ký thất bại. Vui lòng thử lại.']
}

const initialForm: RegistrationFormState = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const SignUpForm: React.FC = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState<RegistrationFormState>(initialForm)
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as keyof RegistrationFormState
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setApiError('')
  }

  const mapApiErrorsToFields = (messages: string[]) => {
    const mapped: RegistrationFieldErrors = {}
    messages.forEach((message) => {
      if (message.toLowerCase().includes('confirmpassword')) {
        mapped.confirmPassword = message
      } else if (message.toLowerCase().includes('fullname')) {
        mapped.fullName = message
      } else if (message.toLowerCase().includes('email')) {
        mapped.email = message
      } else if (message.toLowerCase().includes('password')) {
        mapped.password = message
      }
    })
    setFieldErrors((current) => ({ ...current, ...mapped }))
  }

  // Gửi đúng bốn field và chỉ điều hướng sau khi AuthContext tạo phiên thành công.
  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setApiError('')

    const validationErrors = validateRegistrationForm(form)
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setLoading(true)
    try {
      await register({
        fullName: form.fullName.normalize('NFC').trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      })
      navigate('/')
    } catch (error: unknown) {
      const messages = getRegistrationErrorMessages(error)

      mapApiErrorsToFields(messages)
      setApiError(messages.join(', '))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F5F7] px-5 py-10 text-[#191919] sm:py-[72px]">
      <section className="mx-auto w-full max-w-[400px]">
        <div className="mb-7 text-center">
          <div
            className="text-[40px] font-semibold leading-none tracking-[0.01em] text-[#299D91]"
            aria-label="FINEbank.IO"
          >
            <span className="font-extrabold">FINE</span>bank.IO
          </div>
          <h1 className="mt-8 text-[26px] font-bold leading-8">
            Create an account
          </h1>
        </div>

        <form onSubmit={handleSignUp} noValidate className="space-y-[22px]">
          <Input
            id="fullName"
            name="fullName"
            label="Full Name"
            labelClassName="!text-black dark:!text-black"
            type="text"
            autoComplete="name"
            value={form.fullName}
            onChange={handleChange}
            error={fieldErrors.fullName}
            className="h-12 rounded-lg !border-[#CBD0DC] !bg-white px-4 !text-black placeholder:!text-[#A2A8B2] dark:!border-[#CBD0DC] dark:!bg-white dark:!text-black dark:placeholder:!text-[#A2A8B2] focus:!border-[#299D91] focus:!ring-[#299D91]"
          />

          <Input
            id="email"
            name="email"
            label="Email Address"
            labelClassName="!text-black dark:!text-black"
            type="email"
            autoComplete="email"
            placeholder="hello@example.com"
            value={form.email}
            onChange={handleChange}
            error={fieldErrors.email}
            className="h-12 rounded-lg !border-[#CBD0DC] !bg-white px-4 !text-black placeholder:!text-[#A2A8B2] dark:!border-[#CBD0DC] dark:!bg-white dark:!text-black dark:placeholder:!text-[#A2A8B2] focus:!border-[#299D91] focus:!ring-[#299D91]"
          />

          <Input
            id="password"
            name="password"
            label="Password"
            labelClassName="!text-black dark:!text-black"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            error={fieldErrors.password}
            className="h-12 rounded-lg !border-[#CBD0DC] !bg-white px-4 !text-black placeholder:!text-[#A2A8B2] dark:!border-[#CBD0DC] dark:!bg-white dark:!text-black dark:placeholder:!text-[#A2A8B2] focus:!border-[#299D91] focus:!ring-[#299D91]"
          />

          <Input
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm Password"
            labelClassName="!text-black dark:!text-black"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            className="h-12 rounded-lg !border-[#CBD0DC] !bg-white px-4 !text-black placeholder:!text-[#A2A8B2] dark:!border-[#CBD0DC] dark:!bg-white dark:!text-black dark:placeholder:!text-[#A2A8B2] focus:!border-[#299D91] focus:!ring-[#299D91]"
          />

          <p className="text-sm leading-5 text-[#718096]">
            By continuing, you agree to our{' '}
            <a
              href="#terms"
              className="font-medium text-[#299D91] hover:underline"
            >
              terms of service.
            </a>
          </p>

          {apiError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {apiError}
            </div>
          )}

          <Button
            type="submit"
            isLoading={loading}
            className="!h-12 w-full !rounded !bg-[#299D91] !text-base !font-semibold hover:!bg-[#23877C] focus:!ring-[#299D91]"
          >
            Sign up
          </Button>
        </form>

        <div className="my-8 flex items-center gap-4 text-sm text-[#A2A8B2]">
          <span className="h-px flex-1 bg-[#D9DDE5]" />
          <span>or sign up with</span>
          <span className="h-px flex-1 bg-[#D9DDE5]" />
        </div>

        <button
          type="button"
          className="flex h-12 w-full items-center justify-center gap-4 rounded bg-[#E2E5EA] text-base text-[#4B587C]"
        >
          <span className="text-xl font-bold text-[#299D91]" aria-hidden="true">
            G
          </span>
          Continue with Google
        </button>

        <p className="mt-10 text-center text-base text-[#A2A8B2]">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#299D91] hover:underline"
          >
            Sign in here
          </Link>
        </p>
      </section>
    </main>
  )
}

export default SignUpForm
