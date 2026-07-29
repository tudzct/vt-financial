import React, { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { RegisterRequest } from '../../api/auth.service'
import { RegistrationField, UserFacingError, useAuth } from '../../context/AuthContext'
import Input from '../../components/Input/Input'
import Button from '../../components/Button/Button'

type FormValues = RegisterRequest
type FieldName = keyof FormValues
type FieldErrors = Partial<Record<FieldName, string>>

const passwordAllowedCharacters = new RegExp('^[A-Za-z0-9!@#$%^&*(){}_=+\\[\\],./<>?\\\\|:;-]+$')
const passwordSpecialCharacter = new RegExp('[!@#$%^&*(){}\\-_=+\\[\\],./<>?\\\\|:;]')
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const namePattern = /^\p{L}+(?: \p{L}+)*$/u
const registerInputClassName = 'h-12 rounded-md border-[#d9dde5] !bg-white px-3 text-sm !text-[#24262d] caret-[#24262d] placeholder:!text-[#abb1bc] focus:ring-[#2ba59d] dark:border-[#d9dde5] dark:!bg-white dark:!text-[#24262d] dark:placeholder:!text-[#abb1bc]'
const registerLabelClassName = '!text-[#24262d] dark:!text-[#24262d]'

const getApiErrorField = (message: string): FieldName | undefined => {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('email')) return 'email'
  if (normalizedMessage.includes('full name')) return 'fullName'
  if (normalizedMessage.includes('confirm') || normalizedMessage.includes('passwords do not match')) return 'confirmPassword'
  if (normalizedMessage.includes('password')) return 'password'

  return undefined
}

const isRegistrationField = (field: unknown): field is RegistrationField => {
  return field === 'fullName' || field === 'email' || field === 'password' || field === 'confirmPassword'
}

const focusField = (field: FieldName): void => {
  window.requestAnimationFrame(() => {
    document.querySelector<HTMLInputElement>(`input[name="${field}"]`)?.focus()
  })
}

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const normalizedValues = useMemo(() => ({
    fullName: formData.fullName.normalize('NFC').trim(),
    email: formData.email.trim().toLowerCase(),
  }), [formData.email, formData.fullName])

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}
    const { fullName, email } = normalizedValues

    if (!fullName) errors.fullName = 'Full name is required.'
    else if (fullName.length < 4 || fullName.length > 25) errors.fullName = 'Use 4 to 25 characters.'
    else if (!namePattern.test(fullName)) errors.fullName = 'Use letters separated by single spaces only.'

    if (!email) errors.email = 'Email is required.'
    else if (email.length > 255 || !emailPattern.test(email)) errors.email = 'Enter a valid email address.'

    if (!formData.password) errors.password = 'Password is required.'
    else if (formData.password.length < 8 || formData.password.length > 64) errors.password = 'Use 8 to 64 characters.'
    else if (/\s/.test(formData.password)) errors.password = 'Whitespace is not allowed.'
    else if (!/[a-z]/.test(formData.password)) errors.password = 'Include a lowercase letter.'
    else if (!/[A-Z]/.test(formData.password)) errors.password = 'Include an uppercase letter.'
    else if (!/[0-9]/.test(formData.password)) errors.password = 'Include a digit.'
    else if (!passwordSpecialCharacter.test(formData.password)) errors.password = 'Include a special character.'
    else if (!passwordAllowedCharacters.test(formData.password)) errors.password = 'Use only supported password characters.'
    else if (formData.password.toLowerCase() === email) errors.password = 'Password must not match your email.'
    else if (formData.password.toLowerCase() === email.split('@')[0]) errors.password = 'Password must not match your email local part.'

    if (!formData.confirmPassword) errors.confirmPassword = 'Password confirmation is required.'
    else if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match.'

    return errors
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setFieldErrors((current) => ({ ...current, [e.target.name]: undefined }))
    setApiError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError('')
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setApiError('Please correct the highlighted fields below.')
      focusField(Object.keys(errors)[0] as FieldName)
      return
    }

    setIsLoading(true)

    try {
      await register({
        fullName: normalizedValues.fullName,
        email: normalizedValues.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      })
      setFormData({ fullName: '', email: '', password: '', confirmPassword: '' })
      navigate('/')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.'
      const structuredField = error instanceof Error && isRegistrationField((error as UserFacingError).field)
        ? (error as UserFacingError).field
        : undefined
      const errorField = structuredField || getApiErrorField(message)

      setApiError(message)
      if (errorField) {
        setFieldErrors((current) => ({ ...current, [errorField]: message }))
        focusField(errorField)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f5f7] px-5 py-12 dark:bg-[#f4f5f7] sm:py-20">
      <section className="mx-auto w-full max-w-[400px]" aria-labelledby="register-heading">
        <div className="mb-6 text-center leading-none" aria-label="Finebank.IO">
          <span className="text-[28px] font-extrabold tracking-[0.08em] text-[#2ba59d]">FINE</span>
          <span className="text-[28px] font-medium tracking-[0.08em] text-[#2ba59d]">bank.IO</span>
        </div>
        <h1 id="register-heading" className="mb-6 text-center text-xl font-bold text-[#24262d]">
          Create an account
        </h1>

        {apiError && (
          <div role="alert" aria-live="assertive" className="mb-4 flex items-start gap-2 rounded-md border border-[#fecdca] bg-[#fef3f2] px-3 py-2.5 text-sm font-medium text-[#b42318]">
            <span aria-hidden="true" className="font-bold">!</span>
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Name"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            error={fieldErrors.fullName}
            placeholder="Your full name"
            required
            autoFocus
            disabled={isLoading}
            labelClassName={registerLabelClassName}
            className={registerInputClassName}
          />

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
            placeholder="hello@example.com"
            required
            disabled={isLoading}
            labelClassName={registerLabelClassName}
            className={registerInputClassName}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            placeholder="••••••••"
            required
            minLength={8}
            maxLength={64}
            disabled={isLoading}
            labelClassName={registerLabelClassName}
            className={registerInputClassName}
          />

          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            placeholder="••••••••"
            required
            disabled={isLoading}
            labelClassName={registerLabelClassName}
            className={registerInputClassName}
          />

          <p className="pt-1 text-xs leading-5 text-[#8d94a1]">
            By continuing, you agree to our <a href="#terms" className="text-[#2ba59d] hover:underline">terms of service.</a>
          </p>

          <Button type="submit" variant="primary" className="h-12 w-full rounded !bg-[#2ba59d] text-sm hover:!bg-[#248d87] focus:!ring-[#2ba59d]" isLoading={isLoading}>
            Sign up
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-[#a2a8b4] before:h-px before:flex-1 before:bg-[#d9dde5] after:h-px after:flex-1 after:bg-[#d9dde5]">
          or sign up with
        </div>
        <button type="button" disabled className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-3 rounded bg-[#e5e8ed] text-sm text-[#667085] opacity-80" aria-disabled="true">
          <span className="text-lg font-bold text-[#4285f4]">G</span>
          Continue with Google
        </button>

        <p className="mt-7 text-center text-sm text-[#a2a8b4]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[#2ba59d] hover:underline">
            Sign in here
          </Link>
        </p>
      </section>
    </main>
  )
}

export default Register
