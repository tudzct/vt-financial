import { ChangeEvent, FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../api/auth.service'
import { User } from '../../api/types'
import googleSignInIcon from '../../assets/google-sign-in.png'
import passwordVisibilityIcon from '../../assets/password-visibility.png'
import Button from '../Button/Button'
import { useAuth } from '../../context/AuthContext'

type FormValues = {
  fullName: string
  email: string
  password: string
}

type FieldErrors = Partial<Record<keyof FormValues, string>>

const initialFormValues: FormValues = {
  fullName: '',
  email: '',
  password: '',
}

const allowedPasswordPattern = /^[A-Za-z0-9!@#$%^&*(){}_=+\x5B\x5D,./<>?\\|:;\x2D]+$/
const requiredSpecialCharacterPattern = /[!@#$%^&*(){}_\x2D+=\x5B\x5D,./<>?\\|:;]/

/** Implements the UC-01 Figma signup form and registration flow. */
const SignUpForm = () => {
  const navigate = useNavigate()
  const { establishSession } = useAuth()
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  /** Updates one field while clearing stale validation feedback. */
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    const fieldName = name as keyof FormValues

    setFormValues((currentValues) => ({ ...currentValues, [fieldName]: value }))
    setFieldErrors((currentErrors) => ({ ...currentErrors, [fieldName]: undefined }))
    setFormError('')
  }

  /** Applies all client-applicable BR-REG validation rules before the request. */
  const validate = (): { errors: FieldErrors; normalizedName: string; normalizedEmail: string } => {
    const normalizedName = formValues.fullName.normalize('NFC').trim()
    const normalizedEmail = formValues.email.trim().toLowerCase()
    const { password } = formValues
    const errors: FieldErrors = {}

    if (!normalizedName) {
      errors.fullName = 'Name is required.'
    } else if (normalizedName.length < 4 || normalizedName.length > 25) {
      errors.fullName = 'Name must be between 4 and 25 characters.'
    } else if (!/^\p{L}+(?: \p{L}+)*$/u.test(normalizedName)) {
      errors.fullName = 'Name may only contain letters separated by single spaces.'
    }

    if (!normalizedEmail) {
      errors.email = 'Email address is required.'
    } else if (normalizedEmail.length > 255) {
      errors.email = 'Email address must not exceed 255 characters.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      errors.email = 'Enter a valid email address.'
    }

    if (password.length < 8 || password.length > 64) {
      errors.password = 'Password must be between 8 and 64 characters.'
    } else if (/\s/.test(password)) {
      errors.password = 'Password cannot contain whitespace.'
    } else if (!/[a-z]/.test(password)) {
      errors.password = 'Password must include a lowercase letter.'
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must include an uppercase letter.'
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must include a digit.'
    } else if (!requiredSpecialCharacterPattern.test(password)) {
      errors.password = 'Password must include a permitted special character.'
    } else if (!allowedPasswordPattern.test(password)) {
      errors.password = 'Password contains an unsupported character.'
    }

    return { errors, normalizedName, normalizedEmail }
  }

  /** Submits a valid registration request and establishes the returned session. */
  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLoading) {
      return
    }

    setFormError('')
    const { errors, normalizedName, normalizedEmail } = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsLoading(true)

    try {
      const response = await authService.register({
        fullName: normalizedName,
        email: normalizedEmail,
        password: formValues.password,
        // The Figma frame presents one password control; its value supplies the required confirmation.
        confirmPassword: formValues.password,
      })

      if (!response.success || !response.data) {
        setFormError(response.message || 'Đăng ký thất bại. Vui lòng thử lại.')
        return
      }

      const { accessToken, user: registeredUser } = response.data
      const mappedUser: User = {
        user_id: registeredUser.id,
        full_name: registeredUser.fullName,
        email: registeredUser.email,
        username: '',
        total_balance: 0,
      }

      establishSession(accessToken, mappedUser)
      navigate('/')
    } catch (error: unknown) {
      const responseMessage = (error as { response?: { data?: { message?: string | string[] } } })
        .response?.data?.message
      setFormError(
        Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : responseMessage || 'Đăng ký thất bại. Vui lòng thử lại.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="min-h-screen bg-[#f4f5f7] px-5 py-[106px] text-[#1b1e25] sm:px-8">
      <div className="mx-auto w-full max-w-[400px]">
        <div className="text-center">
          <p className="text-[40px] font-bold leading-[48px] tracking-[-1.8px] text-[#2ca29a]">
            FINE<span className="font-medium">bank</span>.IO
          </p>
          <h1 className="mt-[21px] text-[25px] font-bold leading-8 tracking-[-0.7px]">
            Create an account
          </h1>
        </div>

        <form className="mt-[34px]" noValidate onSubmit={handleSignUp}>
          <FormField
            error={fieldErrors.fullName}
            label="Name"
            name="fullName"
            onChange={handleChange}
            placeholder="Tanzir Rahman"
            value={formValues.fullName}
          />

          <FormField
            error={fieldErrors.email}
            label="Email Address"
            name="email"
            onChange={handleChange}
            placeholder="hello@example.com"
            type="email"
            value={formValues.email}
          />

          <div className="mt-[25px]">
            <label className="block text-[16px] font-medium leading-5" htmlFor="signup-password">
              Password
            </label>
            <div className="relative mt-[10px]">
              <input
                aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
                aria-invalid={Boolean(fieldErrors.password)}
                className={`h-[48px] w-full rounded-[8px] border bg-transparent px-4 pr-12 text-[16px] leading-6 text-[#536178] outline-none transition focus:border-[#52627a] ${
                  fieldErrors.password ? 'border-red-500' : 'border-[#cbd2dc]'
                }`}
                id="signup-password"
                name="password"
                onChange={handleChange}
                placeholder="••••••••••••••"
                type={showPassword ? 'text' : 'password'}
                value={formValues.password}
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-[#9ca5b3]"
                onClick={() => setShowPassword((isVisible) => !isVisible)}
                type="button"
              >
                <img alt="" className="h-[30px] w-[30px]" src={passwordVisibilityIcon} />
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1.5 text-sm text-red-600" id="signup-password-error">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <p className="mt-[31px] text-[14px] leading-5 text-[#68758a]">
            By continuing, you agree to our{' '}
            <a className="text-[#159f98]" href="#terms-of-service">
              terms of service.
            </a>
          </p>

          {formError && (
            <p aria-live="polite" className="mt-3 rounded-[4px] bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}

          <Button
            className="mt-[20px] h-[48px] w-full rounded-[4px] bg-[#2ca298] text-[16px] font-semibold shadow-none hover:bg-[#248c84] focus:ring-[#2ca298]"
            isLoading={isLoading}
            type="submit"
          >
            Sign up
          </Button>
        </form>

        <div className="mt-[35px] flex items-center gap-4 text-[14px] leading-5 text-[#9ba3ae]">
          <span className="h-px flex-1 bg-[#d9dde3]" />
          <span>or sign up with</span>
          <span className="h-px flex-1 bg-[#d9dde3]" />
        </div>

        <button
          className="mt-[31px] flex h-[48px] w-full items-center justify-center gap-3 rounded-[4px] bg-[#e3e6eb] text-[16px] text-[#536178]"
          type="button"
        >
          <img alt="" className="h-6 w-6" src={googleSignInIcon} />
          Continue with Google
        </button>

        <p className="mt-[40px] text-center text-[16px] leading-6 text-[#9ba3ae]">
          Already have an account?{' '}
          <Link className="font-medium text-[#159f98]" to="/login">
            Sign in here
          </Link>
        </p>
      </div>
    </section>
  )
}

type FormFieldProps = {
  error?: string
  label: string
  name: 'fullName' | 'email'
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  type?: 'email' | 'text'
  value: string
}

/** Renders a Figma-sized signup text input and its field-level error. */
const FormField = ({ error, label, name, onChange, placeholder, type = 'text', value }: FormFieldProps) => {
  const inputId = `signup-${name}`

  return (
    <div className="mt-[25px] first:mt-0">
      <label className="block text-[16px] font-medium leading-5" htmlFor={inputId}>
        {label}
      </label>
      <input
        aria-describedby={error ? `${inputId}-error` : undefined}
        aria-invalid={Boolean(error)}
        className={`mt-[10px] h-[48px] w-full rounded-[8px] border bg-transparent px-4 text-[16px] leading-6 text-[#536178] outline-none transition placeholder:text-[#9ca5b3] focus:border-[#52627a] ${
          error ? 'border-red-500' : 'border-[#cbd2dc]'
        }`}
        id={inputId}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-600" id={`${inputId}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

export default SignUpForm
