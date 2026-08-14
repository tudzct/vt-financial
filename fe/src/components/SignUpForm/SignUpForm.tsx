import axios from 'axios'
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../api/auth.service'
import { User } from '../../api/types'
import eyeOutlineIcon from '../../assets/login/eye-outline.svg'
import eyePupilIcon from '../../assets/login/eye-pupil.svg'
import googleBlueIcon from '../../assets/login/google-blue.svg'
import googleGreenIcon from '../../assets/login/google-green.svg'
import googleRedIcon from '../../assets/login/google-red.svg'
import googleYellowIcon from '../../assets/login/google-yellow.svg'
import { useAuth } from '../../context/AuthContext'
import Button from '../Button/Button'

interface FieldErrors {
  fullName?: string
  email?: string
  password?: string
  confirmPassword?: string
}

interface ApiErrorBody {
  message?: string | string[]
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const fullNamePattern = /^[\p{L}]+(?: [\p{L}]+)*$/u
const allowedPasswordPattern = /^[A-Za-z0-9!@#$%^&*(){}_\-=+\[\],./<>?\\|:;]+$/
const specialCharacterPattern = /[!@#$%^&*(){}_\-=+\[\],./<>?\\|:;]/
const fallbackErrorMessage = 'Đăng ký thất bại. Vui lòng thử lại.'

/** Displays and handles the UC-01 registration form. */
const SignUpForm: React.FC = () => {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  /** Enforces the client-applicable UC-01 registration rules. */
  const validate = () => {
    const normalizedFullName = fullName.normalize('NFC').trim()
    const normalizedEmail = email.trim().toLowerCase()
    const errors: FieldErrors = {}
    const fullNameLength = Array.from(normalizedFullName).length

    if (!normalizedFullName) {
      errors.fullName = 'Full name is required.'
    } else if (fullNameLength < 4 || fullNameLength > 25) {
      errors.fullName = 'Full name must be between 4 and 25 characters.'
    } else if (!fullNamePattern.test(normalizedFullName)) {
      errors.fullName = 'Use letters separated by single spaces only.'
    }

    if (!normalizedEmail) {
      errors.email = 'Email address is required.'
    } else if (normalizedEmail.length > 255) {
      errors.email = 'Email must not exceed 255 characters.'
    } else if (!emailPattern.test(normalizedEmail)) {
      errors.email = 'Email address is invalid.'
    }

    if (password.length < 8 || password.length > 64) {
      errors.password = 'Password must be between 8 and 64 characters.'
    } else if (/\s/.test(password)) {
      errors.password = 'Password must not contain whitespace.'
    } else if (!allowedPasswordPattern.test(password)) {
      errors.password = 'Password contains a character that is not permitted.'
    } else if (!/[a-z]/.test(password)) {
      errors.password = 'Password must contain a lowercase letter.'
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must contain an uppercase letter.'
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain a digit.'
    } else if (!specialCharacterPattern.test(password)) {
      errors.password = 'Password must contain a permitted special character.'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Password confirmation is required.'
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match.'
    }

    return { normalizedFullName, normalizedEmail, errors }
  }

  /** Submits a valid registration and establishes the returned session. */
  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isLoading) {
      return
    }

    setFormError('')
    const { normalizedFullName, normalizedEmail, errors } = validate()
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsLoading(true)

    try {
      const response = await authService.register({
        fullName: normalizedFullName,
        email: normalizedEmail,
        password,
        confirmPassword,
      })

      if (!response.success || !response.data) {
        throw new Error(
          Array.isArray(response.message) ? response.message.join(' ') : response.message
        )
      }

      const { accessToken, user: registeredUser } = response.data
      const user: User = {
        user_id: registeredUser.id,
        full_name: registeredUser.fullName,
        email: registeredUser.email,
        username: '',
        total_balance: 0,
      }

      localStorage.setItem('token', accessToken)
      localStorage.setItem('user', JSON.stringify(user))
      updateUser(user)
      navigate('/')
    } catch (error) {
      if (axios.isAxiosError<ApiErrorBody>(error)) {
        const apiMessage = error.response?.data?.message
        setFormError(
          Array.isArray(apiMessage) ? apiMessage.join(' ') : apiMessage || fallbackErrorMessage
        )
      } else {
        setFormError(error instanceof Error && error.message ? error.message : fallbackErrorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const inputClassName = (hasError: boolean) =>
    `h-12 w-full rounded-lg border bg-transparent px-4 py-3 text-base leading-6 text-[#191D23] outline-none transition-colors placeholder:text-[#999DA3] focus:border-[#4B5768] ${
      hasError ? 'border-[#E73D1C]' : 'border-[#D0D5DD]'
    }`

  const renderPasswordToggle = (shown: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      className="absolute right-4 top-3 size-6 overflow-hidden"
      aria-label={shown ? 'Hide password' : 'Show password'}
    >
      <img src={eyeOutlineIcon} alt="" className="absolute inset-0 size-full" />
      <img src={eyePupilIcon} alt="" className="absolute inset-0 size-full" />
    </button>
  )

  return (
    <div className="w-full">
      <h2 className="mb-8 text-center text-2xl font-semibold leading-8 text-[#191D23]">
        Create an account
      </h2>

      <form noValidate onSubmit={handleSignUp}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="fullName" className="text-base font-medium leading-6 text-[#191D23]">Name</label>
            <input
              id="fullName"
              name="fullName"
              autoComplete="name"
              autoFocus
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value)
                setFieldErrors((current) => ({ ...current, fullName: undefined }))
                setFormError('')
              }}
              placeholder="Tanzir Rahman"
              aria-invalid={Boolean(fieldErrors.fullName)}
              aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
              className={inputClassName(Boolean(fieldErrors.fullName))}
            />
            {fieldErrors.fullName && <p id="fullName-error" className="text-sm text-[#E73D1C]">{fieldErrors.fullName}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="register-email" className="text-base font-medium leading-6 text-[#191D23]">Email Address</label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setFieldErrors((current) => ({ ...current, email: undefined }))
                setFormError('')
              }}
              placeholder="hello@example.com"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
              className={inputClassName(Boolean(fieldErrors.email))}
            />
            {fieldErrors.email && <p id="register-email-error" className="text-sm text-[#E73D1C]">{fieldErrors.email}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="register-password" className="text-base font-medium leading-6 text-[#191D23]">Password</label>
            <div className="relative">
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setFieldErrors((current) => ({ ...current, password: undefined }))
                  setFormError('')
                }}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
                className={`${inputClassName(Boolean(fieldErrors.password))} pr-12`}
              />
              {renderPasswordToggle(showPassword, () => setShowPassword((current) => !current))}
            </div>
            {fieldErrors.password && <p id="register-password-error" className="text-sm text-[#E73D1C]">{fieldErrors.password}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirmPassword" className="text-base font-medium leading-6 text-[#191D23]">Confirm Password</label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setFieldErrors((current) => ({ ...current, confirmPassword: undefined }))
                  setFormError('')
                }}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                className={`${inputClassName(Boolean(fieldErrors.confirmPassword))} pr-12`}
              />
              {renderPasswordToggle(showConfirmPassword, () => setShowConfirmPassword((current) => !current))}
            </div>
            {fieldErrors.confirmPassword && <p id="confirmPassword-error" className="text-sm text-[#E73D1C]">{fieldErrors.confirmPassword}</p>}
          </div>
        </div>

        <p className="mt-6 text-xs font-light leading-4 text-[#4B5768]">
          By continuing, you agree to our <span className="font-normal text-[#299D91]">terms of service.</span>
        </p>

        {formError && (
          <div role="alert" className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#E73D1C]">{formError}</div>
        )}

        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
          className="mt-4 !flex !h-12 !w-full !items-center !justify-center !rounded !bg-[#299D91] !px-3 !py-3 !text-base !font-semibold !leading-6 !text-white hover:!bg-[#23877D] focus:!ring-[#299D91]"
        >
          Sign up
        </Button>

        <div className="relative my-6 flex h-9 items-center justify-center">
          <div className="absolute left-[29px] right-[29px] top-1/2 border-t border-[#D0D5DD]" />
          <span className="relative bg-[#F4F5F7] px-2 py-2 text-sm leading-5 text-[#999DA3]">or sign up with</span>
        </div>

        <button type="button" className="flex h-12 w-full items-center justify-center gap-4 rounded bg-[#E4E7EB] px-6 py-3 text-base leading-6 text-[#4B5768]">
          <span className="relative size-6 shrink-0 overflow-hidden" aria-hidden="true">
            <img src={googleBlueIcon} alt="" className="absolute inset-0 size-full" />
            <img src={googleGreenIcon} alt="" className="absolute inset-0 size-full" />
            <img src={googleYellowIcon} alt="" className="absolute inset-0 size-full" />
            <img src={googleRedIcon} alt="" className="absolute inset-0 size-full" />
          </span>
          <span>Continue with Google</span>
        </button>

        <p className="mt-10 text-center text-sm leading-5 text-[#999DA3]">
          Already have an account? <Link to="/login" className="font-semibold text-[#299D91]">Sign in here</Link>
        </p>
      </form>
    </div>
  )
}

export default SignUpForm
