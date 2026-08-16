import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Account from './Account'

const { authUser, getAccountList, logout } = vi.hoisted(() => ({
  authUser: {
    user_id: 1,
    full_name: 'Test User',
    username: 'test-user',
  },
  getAccountList: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('../../api/account.service', () => ({
  accountService: { getAccountList },
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: authUser,
    logout,
  }),
}))

describe('UC-05 account bank names', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'valid-token')
    getAccountList.mockResolvedValue({
      success: true,
      message: 'Lấy danh sách tài khoản thành công',
      data: {
        user_id: 1,
        accounts: [
          {
            id: 3,
            bank_name: 'Vietcombank',
            account_type: 'Credit Card',
            branch_name: 'Hanoi Branch',
            account_number_last_4: '0123',
            balance: 4500000,
          },
        ],
      },
    })
  })

  afterEach(() => {
    localStorage.removeItem('token')
  })

  it('displays the API bank name for a Credit Card account', async () => {
    render(
      <MemoryRouter initialEntries={['/accounts']}>
        <Account />
      </MemoryRouter>
    )

    expect(await screen.findByText('Vietcombank')).toBeInTheDocument()
    expect(screen.queryByText('Master Card')).not.toBeInTheDocument()
  })
})
