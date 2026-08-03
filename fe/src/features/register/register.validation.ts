import {
  RegisterField,
  RegisterFieldErrors,
  RegisterFormState,
  RegisterRequest,
} from './register.types'

const FULL_NAME_PATTERN = /^\p{L}+(?: \p{L}+)*$/u
const PASSWORD_ALLOWED_PATTERN =
  /^[A-Za-z0-9!@#$%^&*(){}_+=\u005b\u005d,./<>?\\|:;\u002d]+$/
const PASSWORD_SPECIAL_PATTERN =
  /[!@#$%^&*(){}_+=\u005b\u005d,./<>?\\|:;\u002d]/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COMMON_PASSWORDS = new Set([
  'password1!',
  'password123!',
  'qwerty123!',
  'admin123!',
  'welcome1!',
  'letmein1!',
])

export const REGISTER_FIELDS: RegisterField[] = [
  'fullName',
  'email',
  'password',
  'confirmPassword',
]

export const normalizeRegisterRequest = (
  form: RegisterFormState,
): RegisterRequest => ({
  fullName: form.fullName.normalize('NFC').trim(),
  email: form.email.trim().toLocaleLowerCase('en-US'),
  password: form.password,
  confirmPassword: form.confirmPassword,
})

export const validateRegisterForm = (
  form: RegisterFormState,
): RegisterFieldErrors => {
  const normalized = normalizeRegisterRequest(form)
  const errors: RegisterFieldErrors = {}
  const nameLength = Array.from(normalized.fullName).length

  if (nameLength < 4 || nameLength > 25) {
    errors.fullName = 'Name must be between 4 and 25 characters.'
  } else if (!FULL_NAME_PATTERN.test(normalized.fullName)) {
    errors.fullName = 'Use letters only, separated by single spaces.'
  }

  if (!normalized.email) {
    errors.email = 'Email address is required.'
  } else if (normalized.email.length > 255) {
    errors.email = 'Email address must not exceed 255 characters.'
  } else if (!EMAIL_PATTERN.test(normalized.email)) {
    errors.email = 'Enter a valid email address.'
  }

  const password = normalized.password
  if (password.length < 8 || password.length > 64) {
    errors.password = 'Password must be between 8 and 64 characters.'
  } else if (/\s/.test(password)) {
    errors.password = 'Password must not contain whitespace.'
  } else if (!PASSWORD_ALLOWED_PATTERN.test(password)) {
    errors.password = 'Password contains an unsupported character.'
  } else if (!/[a-z]/.test(password)) {
    errors.password = 'Password must contain a lowercase letter.'
  } else if (!/[A-Z]/.test(password)) {
    errors.password = 'Password must contain an uppercase letter.'
  } else if (!/[0-9]/.test(password)) {
    errors.password = 'Password must contain a number.'
  } else if (!PASSWORD_SPECIAL_PATTERN.test(password)) {
    errors.password = 'Password must contain a special character.'
  } else if (COMMON_PASSWORDS.has(password.toLocaleLowerCase('en-US'))) {
    errors.password = 'Choose a less common password.'
  } else {
    const passwordIdentity = password.toLocaleLowerCase('en-US')
    const localPart = normalized.email.split('@')[0]
    if (passwordIdentity === normalized.email || passwordIdentity === localPart) {
      errors.password = 'Password must not match your email address.'
    }
  }

  if (!normalized.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.'
  } else if (normalized.confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}
