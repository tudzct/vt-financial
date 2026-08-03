import { describe, expect, it } from 'vitest'
import {
  normalizeRegisterRequest,
  validateRegisterForm,
} from './register.validation'
import { RegisterFormState } from './register.types'

const validForm: RegisterFormState = {
  fullName: 'Nguyễn Văn An',
  email: 'visitor@example.com',
  password: 'StrongPass1!',
  confirmPassword: 'StrongPass1!',
}

describe('register validation', () => {
  it('normalizes only fullName and email', () => {
    const request = normalizeRegisterRequest({
      ...validForm,
      fullName: '  Nguye\u0302\u0303n Văn An  ',
      email: ' VISITOR@EXAMPLE.COM ',
      password: ' StrongPass1!',
      confirmPassword: ' StrongPass1!',
    })

    expect(request).toEqual({
      fullName: 'Nguyễn Văn An',
      email: 'visitor@example.com',
      password: ' StrongPass1!',
      confirmPassword: ' StrongPass1!',
    })
  })

  it.each(['', '   ', 'Abc', 'A'.repeat(26), 'John2 Doe', 'John-Doe', 'John  Doe'])(
    'rejects invalid name %s',
    (fullName) => {
      expect(validateRegisterForm({ ...validForm, fullName }).fullName).toBeTruthy()
    },
  )

  it.each(['Abcd', 'A'.repeat(25), 'Đặng Mỹ Linh'])(
    'accepts boundary and Unicode name %s',
    (fullName) => {
      expect(validateRegisterForm({ ...validForm, fullName }).fullName).toBeUndefined()
    },
  )

  it.each(['', '   ', 'invalid', `${'a'.repeat(244)}@example.com`])(
    'rejects invalid email %s',
    (email) => {
      expect(validateRegisterForm({ ...validForm, email }).email).toBeTruthy()
    },
  )

  it.each([
    'Short1!',
    `${'A'.repeat(63)}a1!`,
    'Strong Pass1!',
    'STRONGPASS1!',
    'strongpass1!',
    'StrongPassword!',
    'StrongPass12',
    'StrongPass1~',
    'Password1!',
  ])('rejects invalid password %s', (password) => {
    expect(
      validateRegisterForm({ ...validForm, password, confirmPassword: password }).password,
    ).toBeTruthy()
  })

  it.each(['', 'strongpass1!', 'StrongPass1?'])(
    'rejects invalid confirmation %s',
    (confirmPassword) => {
      expect(validateRegisterForm({ ...validForm, confirmPassword }).confirmPassword).toBeTruthy()
    },
  )

  it('accepts a valid form', () => {
    expect(validateRegisterForm(validForm)).toEqual({})
  })
})
