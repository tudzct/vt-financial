import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../api/auth.service'
import { User } from '../../api/types'
import Button from '../../components/Button/Button'
import ErrorDisplay from '../../components/Error/Error'
import Input from '../../components/Input/Input'
import { useAuth } from '../../context/AuthContext'
import eyeOutline from '../../assets/auth/eye-outline.svg'
import eyePupil from '../../assets/auth/eye-pupil.svg'
import googleBlue from '../../assets/auth/google-blue.svg'
import googleGreen from '../../assets/auth/google-green.svg'
import googleRed from '../../assets/auth/google-red.svg'
import googleYellow from '../../assets/auth/google-yellow.svg'

interface RegisterForm {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

type FieldErrors = Partial<Record<keyof RegisterForm, string>>

const initialForm: RegisterForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const fullNamePattern = /^\p{L}+(?: \p{L}+)*$/u
const allowedPasswordPattern = /^[A-Za-z0-9!@#$%^&*(){}_+=\[\],./<>?\\|:;\-]+$/
const specialCharacterPattern = /[!@#$%^&*(){}_+=\[\],./<>?\\|:;\-]/

// Figma targets: 102. Signup (137:8071), 101. Login (137:7477).

/** Renders and handles the UC-01 account registration flow. */
const SignUpForm: React.FC = () => {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const [formData, setFormData] = useState<RegisterForm>(initialForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  /** Updates one form field and clears its stale validation state. */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as keyof RegisterForm
    setFormData((current) => ({ ...current, [field]: event.target.value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setError('')
  }

  /** Applies every client-applicable registration rule before submission. */
  const validateForm = (): { errors: FieldErrors; payload: RegisterForm } => {
    const payload = {
      ...formData,
      fullName: formData.fullName.normalize('NFC').trim(),
      email: formData.email.trim().toLowerCase(),
    }
    const errors: FieldErrors = {}
    const fullNameLength = Array.from(payload.fullName).length

    if (!payload.fullName) {
      errors.fullName = 'Full name is required'
    } else if (fullNameLength < 4 || fullNameLength > 25) {
      errors.fullName = 'Full name must be between 4 and 25 characters'
    } else if (!fullNamePattern.test(payload.fullName)) {
      errors.fullName = 'Use letters separated by single spaces only'
    }

    if (!payload.email) {
      errors.email = 'Email address is required'
    } else if (payload.email.length > 255) {
      errors.email = 'Email must not exceed 255 characters'
    } else if (!emailPattern.test(payload.email)) {
      errors.email = 'Enter a valid email address'
    }

    if (!payload.password) {
      errors.password = 'Password is required'
    } else if (payload.password.length < 8 || payload.password.length > 64) {
      errors.password = 'Password must be between 8 and 64 characters'
    } else if (!allowedPasswordPattern.test(payload.password)) {
      errors.password = 'Password contains whitespace or unsupported characters'
    } else if (!/[a-z]/.test(payload.password)) {
      errors.password = 'Password must contain a lowercase letter'
    } else if (!/[A-Z]/.test(payload.password)) {
      errors.password = 'Password must contain an uppercase letter'
    } else if (!/[0-9]/.test(payload.password)) {
      errors.password = 'Password must contain a number'
    } else if (!specialCharacterPattern.test(payload.password)) {
      errors.password = 'Password must contain a special character'
    }

    if (!payload.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (payload.confirmPassword !== payload.password) {
      errors.confirmPassword = 'Passwords do not match'
    }

    return { errors, payload }
  }

  /** Registers the user and establishes the returned authenticated session. */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isLoading) return

    setError('')
    const { errors, payload } = validateForm()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setIsLoading(true)

    try {
      const response = await authService.register(payload)
      if (!response.success || !response.data) {
        throw new globalThis.Error(response.message || 'Registration failed. Please try again.')
      }

      const { accessToken, user } = response.data
      const mappedUser: User = {
        user_id: user.id,
        full_name: user.fullName,
        email: user.email,
        username: user.email.split('@')[0],
        total_balance: 0,
      }

      localStorage.setItem('token', accessToken)
      localStorage.setItem('user', JSON.stringify(mappedUser))
      updateUser(mappedUser)
      navigate('/')
    } catch (requestError: unknown) {
      const apiMessage = (
        requestError as {
          response?: { data?: { message?: string | string[] } }
          message?: string
        }
      ).response?.data?.message
      const message = Array.isArray(apiMessage)
        ? apiMessage.join(' ')
        : apiMessage ||
          (requestError instanceof globalThis.Error ? requestError.message : '') ||
          'Registration failed. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  /** Builds a password input with the design's visibility control. */
  const renderPasswordField = (
    field: 'password' | 'confirmPassword',
    label: string,
    visible: boolean,
    toggleVisibility: () => void,
  ) => (
    <div className="relative">
      <Input
        id={field}
        label={label}
        name={field}
        type={visible ? 'text' : 'password'}
        value={formData[field]}
        onChange={handleChange}
        error={fieldErrors[field]}
        autoComplete="new-password"
        className="h-12 rounded border-[#D1D5DB] bg-transparent pr-12 text-sm text-[#525B75] focus:border-[#299D91] focus:ring-[#299D91]"
      />
      <button
        type="button"
        onClick={toggleVisibility}
        className="absolute right-4 top-[38px] text-[#9CA3AF] transition-colors hover:text-[#525B75]"
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
      >
        <span className="relative block h-6 w-6 overflow-hidden">
          <img src={eyeOutline} alt="" className="absolute left-px top-1 h-4 w-[22px]" />
          <img src={eyePupil} alt="" className="absolute left-2 top-2 h-2 w-2" />
        </span>
      </button>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F4F5F7] text-[#1F2937]">
      <main className="mx-auto flex min-h-full w-full max-w-[400px] flex-col px-5 py-12 sm:px-0 lg:py-16">
        <div className="text-center text-[32px] leading-10 tracking-[1.4px] text-[#299D91]">
          <span className="font-bold">FINE</span>bank.IO
        </div>

        <h1 className="mt-5 text-center text-lg font-bold leading-7">Create an account</h1>

        {error && (
          <div className="mt-5">
            <ErrorDisplay message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
          <Input
            id="fullName"
            label="Name"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            error={fieldErrors.fullName}
            placeholder="Tanzir Rahman"
            autoComplete="name"
            autoFocus
            className="h-12 rounded border-[#8A94A6] bg-transparent text-sm text-[#525B75] placeholder:text-[#9CA3AF] focus:border-[#299D91] focus:ring-[#299D91]"
          />

          <Input
            id="email"
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
            placeholder="hello@example.com"
            autoComplete="email"
            className="h-12 rounded border-[#D1D5DB] bg-transparent text-sm text-[#525B75] placeholder:text-[#9CA3AF] focus:border-[#299D91] focus:ring-[#299D91]"
          />

          {renderPasswordField('password', 'Password', showPassword, () =>
            setShowPassword((current) => !current),
          )}

          {renderPasswordField(
            'confirmPassword',
            'Confirm Password',
            showConfirmPassword,
            () => setShowConfirmPassword((current) => !current),
          )}

          <p className="pt-1 text-xs leading-5 text-[#7C8599]">
            By continuing, you agree to our{' '}
            <a href="#terms" className="text-[#299D91] hover:underline">
              terms of service.
            </a>
          </p>

          <Button
            type="submit"
            isLoading={isLoading}
            disabled={isLoading}
            className="!h-12 w-full !rounded !bg-[#299D91] !py-0 text-sm !font-semibold hover:!bg-[#23877D] focus:!ring-[#299D91]"
          >
            Sign up
          </Button>
        </form>

        <div className="my-8 flex items-center gap-4 text-xs text-[#A0A7B4]">
          <span className="h-px flex-1 bg-[#DDE1E7]" />
          <span>or sign up with</span>
          <span className="h-px flex-1 bg-[#DDE1E7]" />
        </div>

        <button
          type="button"
          className="flex h-12 w-full items-center justify-center gap-3 rounded bg-[#E8EAED] text-sm font-medium text-[#525B75] transition-colors hover:bg-[#DEE1E6]"
        >
          <span className="relative h-6 w-6 overflow-hidden">
            {[googleYellow, googleRed, googleGreen, googleBlue].map((asset) => (
              <img key={asset} src={asset} alt="" className="absolute inset-0 h-6 w-6" />
            ))}
          </span>
          Continue with Google
        </button>

        <p className="mt-11 text-center text-sm text-[#A0A7B4]">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#299D91] hover:underline">
            Sign in here
          </Link>
        </p>
      </main>
    </div>
  )
}

export default SignUpForm
