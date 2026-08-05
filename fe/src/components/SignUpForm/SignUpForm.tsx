import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../api/auth.service'
import { User } from '../../api/types'
import { useAuth } from '../../context/AuthContext'

interface FormValues {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

type FieldErrors = Partial<Record<keyof FormValues, string>>

interface ApiErrorPayload {
  message?: string | string[]
}

interface ApiRequestError {
  response?: {
    status?: number
    data?: ApiErrorPayload
  }
}

const initialValues: FormValues = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const fullNamePattern = /^[\p{L}]+(?: [\p{L}]+)*$/u
const permittedPasswordPattern = /^[A-Za-z0-9!@#$%^&*(){}_=+\[\],./<>?\\|:;\-]+$/
const passwordSpecialCharacterPattern = /[!@#$%^&*(){}\-_+=\[\],./<>?\\|:;]/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Reads a public API error message from an Axios-compatible error. */
const getApiErrorMessage = (error: unknown): string | undefined => {
  const message = (error as ApiRequestError)?.response?.data?.message
  if (Array.isArray(message)) return message.join(', ')
  return message
}

/** Renders and submits the UC-01 account registration form. */
const SignUpForm = () => {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const [values, setValues] = useState<FormValues>(initialValues)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  /** Updates one field and clears its stale validation state. */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as keyof FormValues
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  /** Enforces all client-applicable UC-01 registration rules. */
  const validate = (formValues: FormValues): FieldErrors => {
    const errors: FieldErrors = {}
    const fullName = formValues.fullName.normalize('NFC').trim()
    const email = formValues.email.trim().toLowerCase()
    const fullNameLength = Array.from(fullName).length

    if (!fullName) {
      errors.fullName = 'Name is required.'
    } else if (fullNameLength < 4 || fullNameLength > 25) {
      errors.fullName = 'Name must contain between 4 and 25 characters.'
    } else if (!fullNamePattern.test(fullName)) {
      errors.fullName = 'Use letters separated by single spaces only.'
    }

    if (!email) {
      errors.email = 'Email address is required.'
    } else if (email.length > 255) {
      errors.email = 'Email address must not exceed 255 characters.'
    } else if (!emailPattern.test(email)) {
      errors.email = 'Enter a valid email address.'
    }

    if (!formValues.password) {
      errors.password = 'Password is required.'
    } else if (formValues.password.length < 8 || formValues.password.length > 64) {
      errors.password = 'Password must contain between 8 and 64 characters.'
    } else if (/\s/.test(formValues.password)) {
      errors.password = 'Password must not contain whitespace.'
    } else if (!permittedPasswordPattern.test(formValues.password)) {
      errors.password = 'Password contains a character that is not permitted.'
    } else if (!/[a-z]/.test(formValues.password)) {
      errors.password = 'Password must include a lowercase letter.'
    } else if (!/[A-Z]/.test(formValues.password)) {
      errors.password = 'Password must include an uppercase letter.'
    } else if (!/[0-9]/.test(formValues.password)) {
      errors.password = 'Password must include a number.'
    } else if (!passwordSpecialCharacterPattern.test(formValues.password)) {
      errors.password = 'Password must include a permitted special character.'
    }

    if (!formValues.confirmPassword) {
      errors.confirmPassword = 'Confirm your password.'
    } else if (formValues.confirmPassword !== formValues.password) {
      errors.confirmPassword = 'Passwords do not match.'
    }

    return errors
  }

  /** Registers the user, establishes the session, and navigates home. */
  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLoading) return

    const errors = validate(values)
    setFieldErrors(errors)
    setFormError('')
    if (Object.keys(errors).length > 0) return

    setIsLoading(true)
    try {
      const response = await authService.register({
        fullName: values.fullName.normalize('NFC').trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        confirmPassword: values.confirmPassword,
      })

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Registration failed. Please try again.')
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
      const status = requestError.response?.status
      const apiMessage = getApiErrorMessage(error)

      if (status === 409) {
        setFieldErrors((current) => ({
          ...current,
          email: apiMessage || 'This email is already registered.',
        }))
        setFormError('')
      } else if (status === 400 && apiMessage === 'Passwords do not match') {
        setFieldErrors((current) => ({
          ...current,
          confirmPassword: apiMessage,
        }))
        setFormError('')
      } else {
        const message =
          apiMessage ||
          (error instanceof Error && error.message) ||
          'Registration failed. Please try again.'
        setFormError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  /** Renders a Figma-aligned text field with field-level feedback. */
  const renderField = (
    name: keyof FormValues,
    label: string,
    type: string,
    placeholder: string,
    visibility?: { shown: boolean; toggle: () => void },
  ) => {
    const errorId = `${name}-error`
    return (
      <div>
        <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-[#1f2128]">
          {label}
        </label>
        <div className="relative">
          <input
            id={name}
            name={name}
            type={visibility ? (visibility.shown ? 'text' : 'password') : type}
            value={values[name]}
            onChange={handleChange}
            placeholder={placeholder}
            autoComplete={name === 'email' ? 'email' : name === 'fullName' ? 'name' : 'new-password'}
            aria-invalid={Boolean(fieldErrors[name])}
            aria-describedby={fieldErrors[name] ? errorId : undefined}
            className={`h-[35px] w-full rounded-[5px] border bg-transparent px-[11px] text-xs text-[#52596a] outline-none transition placeholder:text-[#a5aab3] focus:border-[#667085] ${
              visibility ? 'pr-14' : ''
            } ${fieldErrors[name] ? 'border-red-500' : 'border-[#d9dde5]'}`}
          />
          {visibility && (
            <button
              type="button"
              onClick={visibility.toggle}
              className="absolute inset-y-0 right-0 px-3 text-[10px] font-medium text-[#7e8595] hover:text-[#299d91]"
              aria-label={`${visibility.shown ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
            >
              {visibility.shown ? 'Hide' : 'Show'}
            </button>
          )}
        </div>
        {fieldErrors[name] && (
          <p id={errorId} className="mt-1 text-[10px] leading-4 text-red-600">
            {fieldErrors[name]}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f4f5f7] text-[#1f2128]">
      <div className="mx-auto flex min-h-full w-full max-w-[285px] flex-col px-0 pb-12 pt-[76px] sm:pt-[78px]">
        <div className="mb-[17px] text-center text-[28px] leading-none tracking-[0.4px] text-[#299d91]">
          <span className="font-extrabold">FINE</span><span className="font-medium">bank.IO</span>
        </div>
        <h1 className="mb-[25px] text-center text-[18px] font-bold leading-6">Create an account</h1>

        <form onSubmit={handleSignUp} noValidate className="space-y-[17px]">
          {renderField('fullName', 'Name', 'text', 'John Doe')}
          {renderField('email', 'Email Address', 'email', 'hello@example.com')}
          {renderField('password', 'Password', 'password', 'Enter your password', {
            shown: showPassword,
            toggle: () => setShowPassword((current) => !current),
          })}
          {renderField('confirmPassword', 'Confirm Password', 'password', 'Confirm your password', {
            shown: showConfirmPassword,
            toggle: () => setShowConfirmPassword((current) => !current),
          })}

          <p className="text-[10px] leading-4 text-[#7e8595]">
            By continuing, you agree to our{' '}
            <a href="#terms" className="text-[#299d91] hover:underline">terms of service.</a>
          </p>

          {formError && (
            <div role="alert" className="rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-[35px] w-full items-center justify-center rounded-[3px] bg-[#299d91] text-xs font-semibold text-white transition hover:bg-[#23877d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Loading...' : 'Sign Up'}
          </button>

          <div className="flex items-center gap-3 py-[2px] text-[10px] text-[#a5aab3]">
            <span className="h-px flex-1 bg-[#dfe2e8]" />
            <span>or sign up with</span>
            <span className="h-px flex-1 bg-[#dfe2e8]" />
          </div>

          <button
            type="button"
            className="flex h-[35px] w-full items-center justify-center gap-3 rounded-[3px] bg-[#e5e8ed] text-xs font-medium text-[#596174] transition hover:bg-[#dfe3e9]"
          >
            <span aria-hidden="true" className="text-base font-bold text-[#4285f4]">G</span>
            Continue with Google
          </button>
        </form>

        <p className="mt-[29px] text-center text-[11px] text-[#a5aab3]">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#299d91] hover:underline">Sign in here</Link>
        </p>
      </div>
    </div>
  )
}

export default SignUpForm
