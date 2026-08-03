import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '../../api/auth.service'
import Register from './Register'

const establishSession = vi.fn()
const navigate = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ establishSession }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-router-dom')>()
  return { ...original, useNavigate: () => navigate }
})

vi.mock('../../api/auth.service', () => ({
  authService: { register: vi.fn() },
}))

const mockedRegister = vi.mocked(authService.register)

const renderRegister = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )

const fillValidForm = async () => {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Name'), 'Nguyễn Văn An')
  await user.type(screen.getByLabelText('Email Address'), 'Visitor@Example.com')
  await user.type(screen.getByLabelText('Password'), 'StrongPass1!')
  await user.type(screen.getByLabelText('Confirm Password'), 'StrongPass1!')
  return user
}

describe('Register', () => {
  beforeEach(() => {
    mockedRegister.mockReset()
    establishSession.mockReset()
    navigate.mockReset()
  })

  it('renders the required accessible controls and visual-only Google action', () => {
    renderRegister()
    expect(screen.getByLabelText('Name')).toHaveAttribute('autocomplete', 'name')
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Confirm Password')).toBeRequired()
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeDisabled()
  })

  it('focuses the first invalid field and does not call the API', async () => {
    renderRegister()
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(screen.getByLabelText('Name')).toHaveFocus()
    expect(mockedRegister).not.toHaveBeenCalled()
  })

  it('explains how to fix an invalid password and keeps the form usable', async () => {
    const user = userEvent.setup()
    renderRegister()
    await user.type(screen.getByLabelText('Name'), 'Nguyễn Văn An')
    await user.type(screen.getByLabelText('Email Address'), 'visitor@example.com')
    await user.type(screen.getByLabelText('Password'), 'lowercase1!')
    await user.type(screen.getByLabelText('Confirm Password'), 'lowercase1!')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(screen.getByText('Password must contain an uppercase letter.')).toBeVisible()
    expect(screen.getByLabelText('Password')).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled()
    expect(mockedRegister).not.toHaveBeenCalled()
  })

  it('submits normalized data once, establishes the session, and navigates home', async () => {
    let resolveRegistration: ((value: Awaited<ReturnType<typeof authService.register>>) => void) | undefined
    mockedRegister.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRegistration = resolve
        }),
    )
    renderRegister()
    const user = await fillValidForm()
    const submit = screen.getByRole('button', { name: 'Sign up' })
    await user.dblClick(submit)

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledTimes(1))
    expect(mockedRegister.mock.calls[0][0]).toEqual({
      fullName: 'Nguyễn Văn An',
      email: 'visitor@example.com',
      password: 'StrongPass1!',
      confirmPassword: 'StrongPass1!',
    })
    resolveRegistration?.({
      success: true,
      message: 'Account registered successfully.',
      data: {
        accessToken: 'signed.jwt',
        user: { id: 7, fullName: 'Nguyễn Văn An', email: 'visitor@example.com' },
      },
    })
    await waitFor(() => expect(establishSession).toHaveBeenCalledTimes(1))
    expect(establishSession).toHaveBeenCalledWith('signed.jwt', {
      id: 7,
      fullName: 'Nguyễn Văn An',
      email: 'visitor@example.com',
    })
    expect(navigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('shows a duplicate email error, preserves values, and does not authenticate', async () => {
    mockedRegister.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { success: false, message: 'This email is already registered.' },
      },
    })
    renderRegister()
    const user = await fillValidForm()
    fireEvent.submit(screen.getByRole('button', { name: 'Sign up' }).closest('form')!)

    expect(
      await screen.findByText(
        'This email is already registered. Sign in or use a different email address.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled()
    expect(screen.getByLabelText('Email Address')).toHaveValue('Visitor@Example.com')
    expect(establishSession).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    await user.clear(screen.getByLabelText('Email Address'))
  })

  it('clears loading and shows the API error when rendered in StrictMode', async () => {
    mockedRegister.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { success: false, message: 'This email is already registered.' },
      },
    })

    render(
      <React.StrictMode>
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      </React.StrictMode>,
    )
    await fillValidForm()
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(
      await screen.findByText(
        'This email is already registered. Sign in or use a different email address.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled()
    expect(screen.queryByText('Signing up…')).not.toBeInTheDocument()
  })
})
