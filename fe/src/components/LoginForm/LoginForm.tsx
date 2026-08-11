import axios from 'axios'
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import checkIcon from '../../assets/login/check.svg'
import eyeOutlineIcon from '../../assets/login/eye-outline.svg'
import eyePupilIcon from '../../assets/login/eye-pupil.svg'
import googleBlueIcon from '../../assets/login/google-blue.svg'
import googleGreenIcon from '../../assets/login/google-green.svg'
import googleRedIcon from '../../assets/login/google-red.svg'
import googleYellowIcon from '../../assets/login/google-yellow.svg'
import { useAuth } from '../../context/AuthContext'
import Button from '../Button/Button'

interface FieldErrors {
  email?: string
  password?: string
}

interface ApiErrorBody {
  message?: string | string[]
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const invalidCredentialsMessage = 'Email hoặc mật khẩu không đúng.'
const fallbackErrorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.'

/** Displays and handles the UC-02 email/password login form. */
const LoginForm: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validate = (): { normalizedEmail: string; errors: FieldErrors } => {
    const normalizedEmail = email.trim().toLowerCase()
    const errors: FieldErrors = {}

    if (!normalizedEmail) {
      errors.email = 'Email không được để trống.'
    } else if (!emailPattern.test(normalizedEmail)) {
      errors.email = 'Email không hợp lệ.'
    }

    if (password.length === 0) {
      errors.password = 'Mật khẩu không được để trống.'
    }

    return { normalizedEmail, errors }
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isLoading) {
      return
    }

    setFormError('')
    const { normalizedEmail, errors } = validate()
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsLoading(true)

    try {
      await login(normalizedEmail, password)
      navigate('/')
    } catch (error) {
      if (axios.isAxiosError<ApiErrorBody>(error)) {
        if (error.response?.status === 401) {
          setFormError(invalidCredentialsMessage)
        } else {
          const apiMessage = error.response?.data?.message
          setFormError(
            Array.isArray(apiMessage)
              ? apiMessage.join(' ')
              : apiMessage || fallbackErrorMessage
          )
        }
      } else {
        setFormError(error instanceof Error ? error.message : fallbackErrorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className="w-full" noValidate onSubmit={handleLogin}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="h-6 text-base font-medium leading-6 text-[#191D23]" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setFieldErrors((current) => ({ ...current, email: undefined }))
              setFormError('')
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className={`h-12 w-full rounded-lg border bg-transparent px-4 py-3 text-base leading-6 text-[#4B5768] outline-none transition-colors focus:border-[#4B5768] ${
              fieldErrors.email ? 'border-[#E73D1C]' : 'border-[#4B5768]'
            }`}
          />
          {fieldErrors.email && (
            <p id="email-error" className="text-sm leading-5 text-[#E73D1C]">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex h-6 items-center justify-between">
            <label className="text-base font-medium leading-6 text-[#191D23]" htmlFor="password">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-right text-xs font-medium leading-4 text-[#299D91]"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setFieldErrors((current) => ({ ...current, password: undefined }))
                setFormError('')
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              className={`h-12 w-full rounded-lg border bg-transparent py-3 pl-4 pr-12 text-base leading-6 text-[#191D23] outline-none transition-colors focus:border-[#4B5768] ${
                fieldErrors.password ? 'border-[#E73D1C]' : 'border-[#D0D5DD]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-3 size-6 overflow-hidden"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <img src={eyeOutlineIcon} alt="" className="absolute inset-0 size-full" />
              <img src={eyePupilIcon} alt="" className="absolute inset-0 size-full" />
            </button>
          </div>
          {fieldErrors.password && (
            <p id="password-error" className="text-sm leading-5 text-[#E73D1C]">
              {fieldErrors.password}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <label className="flex cursor-pointer items-center gap-4">
          <input
            type="checkbox"
            checked={keepSignedIn}
            onChange={(event) => setKeepSignedIn(event.target.checked)}
            className="peer sr-only"
          />
          <span className="relative size-5 shrink-0 rounded-sm border border-[#D0D5DD] bg-white peer-checked:border-[#299D91] peer-checked:bg-[#299D91]">
            {keepSignedIn && <img src={checkIcon} alt="" className="absolute inset-0 size-full" />}
          </span>
          <span className="text-base font-light leading-6 text-[#191D23]">Keep me signed in</span>
        </label>

        {formError && (
          <div
            role="alert"
            className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-[#E73D1C]"
          >
            {formError}
          </div>
        )}

        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
          className="!flex !h-12 !w-full !items-center !justify-center !rounded !bg-[#299D91] !px-3 !py-3 !text-base !font-semibold !leading-6 !text-white hover:!bg-[#23877D] focus:!ring-[#299D91]"
        >
          Login
        </Button>
      </div>

      <div className="relative my-6 flex h-9 items-center justify-center">
        <div className="absolute left-[29px] right-[29px] top-1/2 border-t border-[#D0D5DD]" />
        <span className="relative bg-[#F4F5F7] px-2 py-2 text-center text-sm leading-5 text-[#999DA3]">
          or sign in with
        </span>
      </div>

      <button
        type="button"
        className="flex h-12 w-full items-center justify-center gap-4 rounded bg-[#E4E7EB] px-[69px] py-3 text-base leading-6 text-[#4B5768]"
      >
        <span className="relative size-6 shrink-0 overflow-hidden" aria-hidden="true">
          <img src={googleBlueIcon} alt="" className="absolute inset-0 size-full" />
          <img src={googleGreenIcon} alt="" className="absolute inset-0 size-full" />
          <img src={googleYellowIcon} alt="" className="absolute inset-0 size-full" />
          <img src={googleRedIcon} alt="" className="absolute inset-0 size-full" />
        </span>
        <span className="whitespace-nowrap">Continue with Google</span>
      </button>
    </form>
  )
}

export default LoginForm
