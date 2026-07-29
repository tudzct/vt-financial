export interface RegistrationFormState {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export type RegistrationFieldErrors = Partial<
  Record<keyof RegistrationFormState, string>
>

const FULL_NAME_PATTERN = /^[\p{L}]+(?: [\p{L}]+)*$/u
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_ALLOWED_PATTERN = /^[A-Za-z0-9!@#$%^&*(){}_=+[\],./<>?\\|:;-]+$/
const PASSWORD_SPECIAL_PATTERN = /[!@#$%^&*(){}\-_+=[\],./<>?\\|:;]/

// Kiểm tra toàn bộ registration rule có thể xác minh ở phía client.
export const validateRegistrationForm = (
  form: RegistrationFormState
): RegistrationFieldErrors => {
  const errors: RegistrationFieldErrors = {}
  const normalizedFullName = form.fullName.normalize('NFC').trim()
  const normalizedEmail = form.email.trim().toLowerCase()

  if (!normalizedFullName) {
    errors.fullName = 'Full Name is required.'
  } else if (
    Array.from(normalizedFullName).length < 4 ||
    Array.from(normalizedFullName).length > 25
  ) {
    errors.fullName = 'Full Name must be between 4 and 25 characters.'
  } else if (!FULL_NAME_PATTERN.test(normalizedFullName)) {
    errors.fullName = 'Use only letters separated by single spaces.'
  }

  if (!normalizedEmail) {
    errors.email = 'Email Address is required.'
  } else if (normalizedEmail.length > 255) {
    errors.email = 'Email Address must not exceed 255 characters.'
  } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!form.password) {
    errors.password = 'Password is required.'
  } else if (form.password.length < 8 || form.password.length > 64) {
    errors.password = 'Password must be between 8 and 64 characters.'
  } else if (/\s/.test(form.password)) {
    errors.password = 'Password must not contain whitespace.'
  } else if (!/[a-z]/.test(form.password)) {
    errors.password = 'Password must contain a lowercase letter.'
  } else if (!/[A-Z]/.test(form.password)) {
    errors.password = 'Password must contain an uppercase letter.'
  } else if (!/[0-9]/.test(form.password)) {
    errors.password = 'Password must contain a digit.'
  } else if (!PASSWORD_SPECIAL_PATTERN.test(form.password)) {
    errors.password = 'Password must contain a permitted special character.'
  } else if (!PASSWORD_ALLOWED_PATTERN.test(form.password)) {
    errors.password = 'Password contains a character that is not permitted.'
  } else if (form.password.toLowerCase() === normalizedEmail) {
    errors.password = 'Password must not equal your email address.'
  } else if (
    form.password.toLowerCase() === normalizedEmail.split('@')[0]
  ) {
    errors.password = 'Password must not equal the email local part.'
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirm Password is required.'
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Confirm Password must exactly match Password.'
  }

  return errors
}
