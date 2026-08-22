import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import eyeOutline from '../../assets/auth/eye-outline.svg'
import eyePupil from '../../assets/auth/eye-pupil.svg'
import googleBlue from '../../assets/auth/google-blue.svg'
import googleGreen from '../../assets/auth/google-green.svg'
import googleRed from '../../assets/auth/google-red.svg'
import googleYellow from '../../assets/auth/google-yellow.svg'
import Button from '../../components/Button/Button'
import { useAuth } from '../../context/AuthContext'

interface LoginFormData {
  email: string
  password: string
}

type FieldErrors = Partial<Record<keyof LoginFormData, string>>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Figma target: 101. Login (137:7477).

/** Renders and handles the UC-02 login flow. */
const LoginForm: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  /** Updates one field and clears errors that no longer apply. */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as keyof LoginFormData
    setFormData((current) => ({ ...current, [field]: event.target.value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setApiError('')
  }

  /** Validates client-applicable login rules and returns the normalized payload. */
  const validateForm = (): { errors: FieldErrors; payload: LoginFormData } => {
    const payload = {
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    }
    const errors: FieldErrors = {}

    if (!payload.email) {
      errors.email = 'Email address is required'
    } else if (!emailPattern.test(payload.email)) {
      errors.email = 'Enter a valid email address'
    }

    if (!payload.password) {
      errors.password = 'Password is required'
    }

    return { errors, payload }
  }

  /** Submits credentials once and establishes the returned authenticated session. */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isLoading) return

    setApiError('')
    const { errors, payload } = validateForm()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setIsLoading(true)

    try {
      await login(payload.email, payload.password)
      navigate('/')
    } catch (requestError: unknown) {
      const message =
        requestError instanceof globalThis.Error
          ? requestError.message
          : 'Đăng nhập thất bại. Vui lòng thử lại.'
      setApiError(message || 'Đăng nhập thất bại. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F4F5F7] text-[#191D23]">
      <main className="mx-auto flex min-h-full w-full max-w-[400px] flex-col px-5 py-12 sm:px-0 lg:pt-40">
        <h1 className="text-center font-['Poppins',sans-serif] text-[40px] leading-8 tracking-[3.2px] text-[#299D91]">
          <span className="font-extrabold">FINE</span>
          <span className="font-medium">bank.</span>
          <span className="font-extrabold">IO</span>
        </h1>

        <div className="mt-16">
          {apiError && (
            <div
              role="alert"
              className="mb-5 rounded border border-[#E73D1C]/30 bg-red-50 px-4 py-3 text-sm text-[#B42318]"
            >
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="mb-2 block text-base font-medium leading-6">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                autoFocus
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                className={`h-12 w-full rounded-lg border bg-transparent px-4 text-base text-[#4B5768] outline-none transition focus:border-[#299D91] focus:ring-1 focus:ring-[#299D91] ${
                  fieldErrors.email ? 'border-[#E73D1C]' : 'border-[#4B5768]'
                }`}
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-[#E73D1C]">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-base font-medium leading-6">
                  Password
                </label>
                <a
                  href="#forgot-password"
                  className="text-xs font-medium leading-4 text-[#299D91] hover:underline"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className={`h-12 w-full rounded-lg border bg-transparent px-4 pr-12 text-base text-[#4B5768] outline-none transition focus:border-[#299D91] focus:ring-1 focus:ring-[#299D91] ${
                    fieldErrors.password ? 'border-[#E73D1C]' : 'border-[#D0D5DD]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-3 h-6 w-6 overflow-hidden text-[#999DA3]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <img src={eyeOutline} alt="" className="absolute left-px top-1 h-4 w-[22px]" />
                  <img src={eyePupil} alt="" className="absolute left-2 top-2 h-2 w-2" />
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="mt-1 text-sm text-[#E73D1C]">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <label className="mt-8 flex cursor-pointer items-center gap-4 text-base font-light leading-6">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(event) => setKeepSignedIn(event.target.checked)}
                className="peer sr-only"
              />
              <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-[#D0D5DD] bg-white peer-checked:border-[#299D91] peer-checked:bg-[#299D91]">
                {keepSignedIn && (
                  <svg
                    viewBox="0 0 20 20"
                    className="h-4 w-4 fill-none stroke-white"
                    aria-hidden="true"
                  >
                    <path
                      d="m5 10 3 3 7-7"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              Keep me signed in
            </label>

            <Button
              type="submit"
              isLoading={isLoading}
              disabled={isLoading}
              className="mt-4 !h-12 w-full !rounded !bg-[#299D91] !py-0 text-base !font-semibold hover:!bg-[#23877D] focus:!ring-[#299D91]"
            >
              Login
            </Button>
          </form>

          <div className="my-4 flex items-center gap-4 text-sm text-[#999DA3]">
            <span className="h-px flex-1 bg-[#D0D5DD]" />
            <span className="whitespace-nowrap bg-[#F4F5F7] px-2">or sign in with</span>
            <span className="h-px flex-1 bg-[#D0D5DD]" />
          </div>

          <button
            type="button"
            className="flex h-12 w-full items-center justify-center gap-4 rounded bg-[#E4E7EB] text-base text-[#4B5768] transition-colors hover:bg-[#D9DDE3]"
          >
            <span className="relative h-6 w-6 overflow-hidden">
              {[googleYellow, googleRed, googleGreen, googleBlue].map((asset) => (
                <img key={asset} src={asset} alt="" className="absolute inset-0 h-6 w-6" />
              ))}
            </span>
            Continue with Google
          </button>

          <Link
            to="/register"
            className="mt-10 block text-center text-base font-semibold leading-6 text-[#299D91] hover:underline"
          >
            Create an account
          </Link>
        </div>
      </main>
    </div>
  )
}

export default LoginForm
