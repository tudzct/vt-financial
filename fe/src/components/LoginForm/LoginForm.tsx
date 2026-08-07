import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import dividerLine from '../../assets/login/divider-line.svg'
import eyeOutline from '../../assets/login/eye-outline.svg'
import eyePupil from '../../assets/login/eye-pupil.svg'
import googleIconBlue from '../../assets/login/google-icon-blue.svg'
import googleIconGreen from '../../assets/login/google-icon-green.svg'
import googleIconRed from '../../assets/login/google-icon-red.svg'
import googleIconYellow from '../../assets/login/google-icon-yellow.svg'
import tick from '../../assets/login/tick.svg'
import { authService } from '../../api/auth.service'
import { User } from '../../api/types'
import Button from '../Button/Button'
import { useAuth } from '../../context/AuthContext'

interface LoginValues {
  email: string
  password: string
}

type FieldErrors = Partial<Record<keyof LoginValues, string>>

interface ApiErrorPayload {
  message?: string | string[]
}

interface ApiRequestError {
  response?: {
    status?: number
    data?: ApiErrorPayload
  }
}

const initialValues: LoginValues = {
  email: '',
  password: '',
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Extracts a safe, user-facing error message from an Axios-compatible error. */
const getApiErrorMessage = (error: unknown): string | undefined => {
  const message = (error as ApiRequestError)?.response?.data?.message
  return Array.isArray(message) ? message.join(', ') : message
}

/** Renders and submits the UC-02 email and password login form. */
const LoginForm = () => {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const [values, setValues] = useState<LoginValues>(initialValues)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  /** Updates one field and clears stale validation feedback. */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as keyof LoginValues
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  /** Enforces the client-applicable BR-LOG-01 and BR-LOG-02 constraints. */
  const validate = (formValues: LoginValues): FieldErrors => {
    const errors: FieldErrors = {}
    const email = formValues.email.trim().toLowerCase()

    if (!email) {
      errors.email = 'Email address is required.'
    } else if (!emailPattern.test(email)) {
      errors.email = 'Enter a valid email address.'
    }

    if (!formValues.password) {
      errors.password = 'Password is required.'
    }

    return errors
  }

  /** Authenticates the user, persists the session, and opens the home route. */
  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLoading) return

    const errors = validate(values)
    setFieldErrors(errors)
    setFormError('')
    if (Object.keys(errors).length > 0) return

    setIsLoading(true)
    try {
      const response = await authService.login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      })

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Login failed. Please try again.')
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
    } catch (error: unknown) {
      const requestError = error as ApiRequestError
      if (requestError.response?.status === 401) {
        setFormError('Email or password is wrong.')
        return
      }

      setFormError(
        getApiErrorMessage(error) ||
          (error instanceof Error && error.message) ||
          'Login failed. Please try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f4f5f7] text-[#191d23]">
      <div className="mx-auto flex min-h-full w-full max-w-[440px] flex-col items-center px-5 pb-10 pt-20 sm:pt-40">
        <div className="flex w-full flex-col items-center gap-16">
          <h1 className="font-['Poppins'] text-[40px] leading-8 tracking-[3.2px] text-[#299d91]">
            <span className="font-extrabold">FINE</span>
            <span className="font-medium">bank.</span>
            <span className="font-extrabold">IO</span>
          </h1>

          <form onSubmit={handleLogin} noValidate className="flex w-full flex-col gap-6">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-6">
                <div>
                  <label htmlFor="email" className="mb-2 block text-base font-medium leading-6">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    autoComplete="email"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    className={`h-12 w-full rounded-[8px] border bg-transparent px-4 py-3 text-base leading-6 text-[#4b5768] outline-none transition placeholder:text-[#999da3] focus:border-[#4b5768] focus:ring-1 focus:ring-[#4b5768] disabled:cursor-not-allowed disabled:opacity-60 ${
                      fieldErrors.email ? 'border-[#e73d1c]' : 'border-[#4b5768]'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p id="email-error" className="mt-1 text-xs leading-4 text-[#e73d1c]">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="password" className="text-base font-medium leading-6">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs leading-4 text-[#299d91] hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={values.password}
                      onChange={handleChange}
                      disabled={isLoading}
                      autoComplete="current-password"
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                      className={`h-12 w-full rounded-[8px] border bg-transparent px-4 py-3 pr-12 text-base leading-6 text-[#4b5768] outline-none transition placeholder:text-[#999da3] focus:border-[#4b5768] focus:ring-1 focus:ring-[#4b5768] disabled:cursor-not-allowed disabled:opacity-60 ${
                        fieldErrors.password ? 'border-[#e73d1c]' : 'border-[#d0d5dd]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={isLoading}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[8px] text-[#999da3] transition hover:text-[#4b5768] disabled:cursor-not-allowed"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="relative block size-6" aria-hidden="true">
                        <img src={eyeOutline} alt="" className="absolute inset-0 size-full" />
                        <img src={eyePupil} alt="" className="absolute inset-0 size-full" />
                      </span>
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p id="password-error" className="mt-1 text-xs leading-4 text-[#e73d1c]">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <label className="flex cursor-pointer items-center gap-4 text-base font-light leading-6 text-[#191d23]">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(event) => setKeepSignedIn(event.target.checked)}
                    disabled={isLoading}
                    className="peer sr-only"
                  />
                  <span className="flex size-5 items-center justify-center rounded-[2px] border border-[#d0d5dd] bg-white peer-checked:border-[#299d91] peer-checked:bg-[#299d91] peer-disabled:cursor-not-allowed peer-disabled:opacity-60">
                    <img
                      src={tick}
                      alt=""
                      className={`${keepSignedIn ? 'block' : 'hidden'} size-full`}
                    />
                  </span>
                  Keep me signed in
                </label>

                {formError && (
                  <p role="alert" className="text-sm leading-5 text-[#e73d1c]">
                    {formError}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  loadingText="Loading..."
                  className="h-12 w-full !rounded-[4px] !bg-[#299d91] !px-3 !py-4 text-base font-semibold leading-6 hover:!bg-[#23877d] focus:!ring-[#299d91]"
                >
                  Login
                </Button>
              </div>
            </div>

            <div className="relative flex h-10 items-center justify-center">
              <img
                src={dividerLine}
                alt=""
                className="absolute h-px w-[342px] max-w-full"
              />
              <span className="relative bg-[#f4f5f7] px-2 py-2 text-center text-sm leading-5 text-[#999da3]">
                or sign in with
              </span>
            </div>

            <Button
              type="button"
              variant="secondary"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-4 !rounded-[4px] !bg-[#e4e7eb] !px-[69px] !py-3 text-base font-normal leading-6 !text-[#4b5768] hover:!bg-[#d8dce2] focus:!ring-[#4b5768]"
            >
              <span className="relative block size-6" aria-hidden="true">
                <img src={googleIconRed} alt="" className="absolute inset-0 size-full" />
                <img src={googleIconYellow} alt="" className="absolute inset-0 size-full" />
                <img src={googleIconBlue} alt="" className="absolute inset-0 size-full" />
                <img src={googleIconGreen} alt="" className="absolute inset-0 size-full" />
              </span>
              Continue with Google
            </Button>
          </form>
        </div>

        <Link
          to="/register"
          className="mt-10 w-full text-center text-base font-semibold leading-6 text-[#299d91] hover:underline"
        >
          Create an account
        </Link>
      </div>
    </div>
  )
}

export default LoginForm
