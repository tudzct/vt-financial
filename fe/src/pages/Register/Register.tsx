import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../api/auth.service'
import { normalizeApiError } from '../../api/error'
import Input from '../../components/Input/Input'
import { useAuth } from '../../context/AuthContext'
import {
  REGISTER_FIELDS,
  normalizeRegisterRequest,
  validateRegisterForm,
} from '../../features/register/register.validation'
import {
  RegisterField,
  RegisterFieldErrors,
  RegisterFormState,
} from '../../features/register/register.types'

const INITIAL_FORM: RegisterFormState = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { establishSession } = useAuth()
  const [form, setForm] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({})
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const submittingRef = useRef(false)
  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const controllerRef = useRef<AbortController | null>(null)
  const fieldRefs = useRef<Partial<Record<RegisterField, HTMLInputElement>>>({})
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  useEffect(
    () => {
      // React StrictMode runs an extra setup/cleanup cycle in development.
      // Reset the flag on every setup so failed requests can still clear loading.
      mountedRef.current = true
      return () => {
        mountedRef.current = false
        controllerRef.current?.abort()
      }
    },
    [],
  )

  const focusField = (field: RegisterField) => fieldRefs.current[field]?.focus()

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as RegisterField
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setFormErrors([])
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return

    const validationErrors = validateRegisterForm(form)
    setFieldErrors(validationErrors)
    setFormErrors([])
    const firstInvalidField = REGISTER_FIELDS.find((field) => validationErrors[field])
    if (firstInvalidField) {
      focusField(firstInvalidField)
      return
    }

    submittingRef.current = true
    setIsSubmitting(true)
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const controller = new AbortController()
    controllerRef.current = controller

    try {
      const response = await authService.register(normalizeRegisterRequest(form), controller.signal)
      if (!mountedRef.current || requestId !== requestIdRef.current) return
      establishSession(response.data.accessToken, response.data.user)
      navigate('/', { replace: true })
    } catch (error: unknown) {
      if (!mountedRef.current || requestId !== requestIdRef.current || controller.signal.aborted) {
        return
      }
      const normalized = normalizeApiError(error)
      if (normalized.status === 409) {
        setFieldErrors((current) => ({
          ...current,
          email: 'This email is already registered. Sign in or use a different email address.',
        }))
        focusField('email')
      } else if (normalized.status === 400) {
        const nextFieldErrors: RegisterFieldErrors = {}
        const remainingMessages: string[] = []

        normalized.messages.forEach((message) => {
          const lowerMessage = message.toLocaleLowerCase('en-US')
          if (lowerMessage.includes('confirm') || lowerMessage.includes('do not match')) {
            nextFieldErrors.confirmPassword ??= message
          } else if (lowerMessage.includes('password')) {
            nextFieldErrors.password ??= message
          } else if (lowerMessage.includes('email')) {
            nextFieldErrors.email ??= message
          } else if (lowerMessage.includes('fullname') || lowerMessage.includes('name')) {
            nextFieldErrors.fullName ??= message
          } else {
            remainingMessages.push(message)
          }
        })

        setFieldErrors((current) => ({ ...current, ...nextFieldErrors }))
        setFormErrors(remainingMessages)
        const firstApiField = REGISTER_FIELDS.find((field) => nextFieldErrors[field])
        if (firstApiField) focusField(firstApiField)
        if (remainingMessages.length > 0) {
          requestAnimationFrame(() => errorSummaryRef.current?.focus())
        }
      } else {
        setFormErrors(normalized.messages)
        requestAnimationFrame(() => errorSummaryRef.current?.focus())
      }
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        submittingRef.current = false
        setIsSubmitting(false)
      }
    }
  }

  const visibilityButton = (
    shown: boolean,
    toggle: React.Dispatch<React.SetStateAction<boolean>>,
    label: string,
  ) => (
    <button
      type="button"
      className="rounded p-1 focus:outline-none focus:ring-2 focus:ring-[#299d91]"
      aria-label={`${shown ? 'Hide' : 'Show'} ${label}`}
      aria-pressed={shown}
      onClick={() => toggle((current) => !current)}
    >
      <span className="figma-eye-icon block" aria-hidden="true" />
    </button>
  )

  return (
    <section className="finebank-auth-page" aria-labelledby="register-title">
      <div className="finebank-signup-shell" data-node-id="137:8071">
        <div className="finebank-logo" aria-label="FINEbank.IO">
          <strong>FINE</strong>bank.IO
        </div>
        <h1 id="register-title">Create an account</h1>

        <form onSubmit={handleSubmit} aria-busy={isSubmitting} noValidate>
          {formErrors.length > 0 && (
            <div
              ref={errorSummaryRef}
              className="finebank-form-error"
              role="alert"
              tabIndex={-1}
            >
              {formErrors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}

          <div className="finebank-field-stack">
            <Input
              ref={(element) => {
                fieldRefs.current.fullName = element ?? undefined
              }}
              id="fullName"
              label="Name"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Tanzir Rahman"
              value={form.fullName}
              error={fieldErrors.fullName}
              onChange={handleChange}
              className="finebank-input"
              required
            />
            <Input
              ref={(element) => {
                fieldRefs.current.email = element ?? undefined
              }}
              id="email"
              label="Email Address"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="hello@example.com"
              value={form.email}
              error={fieldErrors.email}
              onChange={handleChange}
              className="finebank-input"
              required
            />
            <Input
              ref={(element) => {
                fieldRefs.current.password = element ?? undefined
              }}
              id="password"
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.password}
              error={fieldErrors.password}
              helperText="Use 8–64 characters with uppercase, lowercase, a number, and a special character."
              onChange={handleChange}
              className="finebank-input"
              trailingElement={visibilityButton(showPassword, setShowPassword, 'password')}
              required
            />
            <Input
              ref={(element) => {
                fieldRefs.current.confirmPassword = element ?? undefined
              }}
              id="confirmPassword"
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmation ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.confirmPassword}
              error={fieldErrors.confirmPassword}
              onChange={handleChange}
              className="finebank-input"
              trailingElement={visibilityButton(
                showConfirmation,
                setShowConfirmation,
                'password confirmation',
              )}
              required
            />
          </div>

          <p className="finebank-terms">
            By continuing, you agree to our <a href="/terms">terms of service.</a>
          </p>

          <button className="finebank-primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <span className="finebank-button-loading">Signing up…</span> : 'Sign up'}
          </button>

          <div className="finebank-divider" aria-hidden="true">
            <span />
            <p>or sign up with</p>
            <span />
          </div>

          <button
            className="finebank-google-button"
            type="button"
            aria-label="Continue with Google (not currently available)"
            disabled
          >
            <span className="figma-google-icon" aria-hidden="true" />
            Continue with Google
          </button>
        </form>

        <p className="finebank-signin-link">
          Already have an account? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </section>
  )
}

export default Register
