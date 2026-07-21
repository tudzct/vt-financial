import React, { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { RegisterRequest } from '../../api/auth.service'
import { useAuth } from '../../context/AuthContext'

type FieldName = keyof RegisterRequest
type FieldErrors = Partial<Record<FieldName, string>>

const FULL_NAME_PATTERN = /^\p{L}+(?: \p{L}+)*$/u
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_ALLOWED_PATTERN =
  /^[A-Za-z0-9!@#$%^&*(){}_+=[\],./<>?\\|:;-]+$/
const PASSWORD_SPECIAL_PATTERN = /[!@#$%^&*(){}_+=[\],./<>?\\|:;-]/

const emptyForm: RegisterRequest = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const normalizeForm = (form: RegisterRequest): RegisterRequest => ({
  fullName: form.fullName.normalize('NFC').trim(),
  email: form.email.trim().toLowerCase(),
  password: form.password,
  confirmPassword: form.confirmPassword,
})

const configuredBlacklist = new Set(
  (import.meta.env.VITE_REGISTRATION_PASSWORD_BLACKLIST || '')
    .split(',')
    .map((value: string) => value.trim().toLowerCase())
    .filter(Boolean),
)

const validateForm = (form: RegisterRequest): FieldErrors => {
  const normalized = normalizeForm(form)
  const errors: FieldErrors = {}

  if (!normalized.fullName) {
    errors.fullName = 'Full name is required.'
  } else if (normalized.fullName.length < 4 || normalized.fullName.length > 25) {
    errors.fullName = 'Full name must contain between 4 and 25 characters.'
  } else if (!FULL_NAME_PATTERN.test(normalized.fullName)) {
    errors.fullName = 'Use letters separated by single spaces only.'
  }

  if (!normalized.email) {
    errors.email = 'Email is required.'
  } else if (normalized.email.length > 255) {
    errors.email = 'Email must not exceed 255 characters.'
  } else if (!EMAIL_PATTERN.test(normalized.email)) {
    errors.email = 'Enter a valid email address.'
  }

  const password = normalized.password
  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < 8 || password.length > 64) {
    errors.password = 'Password must contain between 8 and 64 characters.'
  } else if (/\s/.test(password)) {
    errors.password = 'Password must not contain whitespace.'
  } else if (!PASSWORD_ALLOWED_PATTERN.test(password)) {
    errors.password = 'Password contains a character that is not permitted.'
  } else if (!/[a-z]/.test(password)) {
    errors.password = 'Include at least one lowercase letter.'
  } else if (!/[A-Z]/.test(password)) {
    errors.password = 'Include at least one uppercase letter.'
  } else if (!/[0-9]/.test(password)) {
    errors.password = 'Include at least one digit.'
  } else if (!PASSWORD_SPECIAL_PATTERN.test(password)) {
    errors.password = 'Include at least one permitted special character.'
  } else if (configuredBlacklist.has(password.toLowerCase())) {
    errors.password = 'Password is too common.'
  } else if (
    password.toLowerCase() === normalized.email ||
    password.toLowerCase() === normalized.email.split('@')[0]
  ) {
    errors.password = 'Password must not match your email address.'
  }

  if (!normalized.confirmPassword) {
    errors.confirmPassword = 'Password confirmation is required.'
  } else if (normalized.confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

const readApiMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : 'Registration failed. Please try again.'
  }

  const message = error.response?.data?.message
  if (Array.isArray(message)) {
    return message.join(' ')
  }
  return typeof message === 'string'
    ? message
    : 'Registration failed. Please try again.'
}

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  trailing?: React.ReactNode
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  trailing,
  className = '',
  id,
  ...props
}) => (
  <div>
    <label htmlFor={id} className="mb-2 block text-sm font-medium text-[#202124]">
      {label}
    </label>
    <div className="relative">
      <input
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-12 w-full rounded-[5px] border bg-transparent px-4 text-sm text-[#344054] outline-none transition placeholder:text-[#98A2B3] focus:border-[#667085] focus:ring-1 focus:ring-[#667085] disabled:cursor-not-allowed disabled:bg-[#E8EAED] disabled:text-[#98A2B3] ${
          error
            ? 'border-[#D92D20] focus:border-[#D92D20] focus:ring-[#D92D20]'
            : 'border-[#D0D5DD]'
        } ${trailing ? 'pr-12' : ''} ${className}`}
      />
      {trailing && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {trailing}
        </div>
      )}
    </div>
    {error && (
      <p id={`${id}-error`} className="mt-1.5 text-xs text-[#D92D20]" role="alert">
        {error}
      </p>
    )}
  </div>
)

const EyeIcon: React.FC<{ hidden: boolean }> = ({ hidden }) => (
  <svg
    aria-hidden="true"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z"
    />
    <circle cx="12" cy="12" r="2.5" />
    {hidden && <path strokeLinecap="round" d="m4 4 16 16" />}
  </svg>
)

const GoogleIcon: React.FC = () => (
  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.74 2.98-4.31 2.98-7.35Z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.4 13.91A6.02 6.02 0 0 1 6.09 12c0-.66.11-1.3.31-1.91V7.5H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.5l3.34-2.59Z" />
    <path fill="#EA4335" d="M12 5.97c1.47 0 2.79.51 3.83 1.49l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.94 5.5l3.34 2.59c.79-2.36 3-4.12 5.6-4.12Z" />
  </svg>
)

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState<RegisterRequest>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as FieldName
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setApiError('')
  }

  const handleBlur = (field: FieldName) => {
    const errors = validateForm(form)
    setFieldErrors((current) => ({ ...current, [field]: errors[field] }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isLoading) return

    const normalized = normalizeForm(form)
    const errors = validateForm(normalized)
    setFieldErrors(errors)
    setApiError('')
    if (Object.keys(errors).length > 0) return

    setIsLoading(true)
    try {
      const message = await register(normalized)
      setForm(emptyForm)
      navigate('/', {
        replace: true,
        state: { registrationMessage: message },
      })
    } catch (error: unknown) {
      const message = readApiMessage(error)
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setFieldErrors((current) => ({ ...current, email: message }))
      } else if (/passwords do not match/i.test(message)) {
        setFieldErrors((current) => ({
          ...current,
          confirmPassword: message,
        }))
      } else {
        setApiError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const passwordToggle = (
    visible: boolean,
    setVisible: React.Dispatch<React.SetStateAction<boolean>>,
    label: string,
  ) => (
    <button
      type="button"
      className="rounded p-1 text-[#98A2B3] hover:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#299D91] disabled:cursor-not-allowed disabled:opacity-50"
      onClick={() => setVisible((current) => !current)}
      disabled={isLoading}
      aria-label={label}
    >
      <EyeIcon hidden={!visible} />
    </button>
  )

  return (
    <div className="min-h-screen bg-[#F4F5F7] px-6 py-12 sm:py-[72px]">
      <main className="mx-auto w-full max-w-[400px]" aria-busy={isLoading}>
        <Link
          to="/"
          className="block text-center text-[28px] font-bold tracking-[0.02em] text-[#299D91] focus:outline-none focus:ring-2 focus:ring-[#299D91]"
          aria-label="Finebank home"
        >
          FINE<span className="font-medium">bank.IO</span>
        </Link>

        <h1 className="mt-4 text-center text-xl font-semibold text-[#202124]">
          Create an account
        </h1>

        {apiError && (
          <div
            className="mt-5 rounded-[5px] border border-[#FDA29B] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318]"
            role="alert"
          >
            {apiError}
          </div>
        )}

        <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
          <FormField
            id="registration-full-name"
            label="Name"
            name="fullName"
            type="text"
            value={form.fullName}
            onChange={handleChange}
            onBlur={() => handleBlur('fullName')}
            error={fieldErrors.fullName}
            placeholder="Tanzir Rahman"
            autoComplete="name"
            autoFocus
            disabled={isLoading}
            maxLength={25}
          />

          <FormField
            id="registration-email"
            label="Email Address"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            onBlur={() => handleBlur('email')}
            error={fieldErrors.email}
            placeholder="hello@example.com"
            autoComplete="email"
            disabled={isLoading}
            maxLength={255}
          />

          <FormField
            id="registration-password"
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={handleChange}
            onBlur={() => handleBlur('password')}
            error={fieldErrors.password}
            placeholder="••••••••••••"
            autoComplete="new-password"
            disabled={isLoading}
            maxLength={64}
            trailing={passwordToggle(
              showPassword,
              setShowPassword,
              showPassword ? 'Hide password' : 'Show password',
            )}
          />

          <FormField
            id="registration-confirm-password"
            label="Confirm Password"
            name="confirmPassword"
            type={showConfirmation ? 'text' : 'password'}
            value={form.confirmPassword}
            onChange={handleChange}
            onBlur={() => handleBlur('confirmPassword')}
            error={fieldErrors.confirmPassword}
            placeholder="••••••••••••"
            autoComplete="new-password"
            disabled={isLoading}
            maxLength={64}
            trailing={passwordToggle(
              showConfirmation,
              setShowConfirmation,
              showConfirmation ? 'Hide password confirmation' : 'Show password confirmation',
            )}
          />

          <p className="text-xs leading-5 text-[#667085]">
            By continuing, you agree to our{' '}
            <a href="#terms" className="text-[#299D91] hover:underline">
              terms of service.
            </a>
          </p>

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-12 w-full items-center justify-center rounded-[4px] bg-[#299D91] text-sm font-semibold text-white transition hover:bg-[#23867C] focus:outline-none focus:ring-2 focus:ring-[#299D91] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#8BC9C3]"
          >
            {isLoading ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0A12 12 0 0 0 0 12h4Z" />
                </svg>
                Signing up...
              </>
            ) : (
              'Sign up'
            )}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1 bg-[#D9DDE4]" />
          <span className="text-xs text-[#98A2B3]">or sign up with</span>
          <span className="h-px flex-1 bg-[#D9DDE4]" />
        </div>

        <button
          type="button"
          disabled
          title="Google registration is not available"
          className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-3 rounded-[4px] bg-[#E4E7EC] text-sm text-[#667085]"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="mt-8 text-center text-sm text-[#98A2B3]">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#299D91] hover:underline focus:outline-none focus:ring-2 focus:ring-[#299D91]"
          >
            Sign in here
          </Link>
        </p>
      </main>
    </div>
  )
}

export default Register
