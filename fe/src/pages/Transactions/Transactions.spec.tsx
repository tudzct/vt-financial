import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TransactionsPage from './Transactions'

const { getTransactions } = vi.hoisted(() => ({
  getTransactions: vi.fn(),
}))

vi.mock('../../api/transaction.service', () => ({
  transactionService: { getTransactions },
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { full_name: 'Test User' }, logout: vi.fn() }),
}))

/** Renders transaction history with a real in-memory create-route target. */
const renderPage = (initialEntry = '/transactions') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/transactions/add" element={<div>Add route reached</div>} />
      </Routes>
    </MemoryRouter>
  )

describe('UC-04 entry from transaction history', () => {
  beforeEach(() => {
    getTransactions.mockResolvedValue({ data: [], total: 0, hasMore: false })
  })

  it('shows Add Transaction and navigates to the create route', async () => {
    const user = userEvent.setup()
    renderPage()

    const addButton = await screen.findByRole('button', {
      name: /add transaction/i,
    })
    await user.click(addButton)

    expect(screen.getByText('Add route reached')).toBeInTheDocument()
  })

  it('restores a supported filter from the URL', async () => {
    renderPage('/transactions?type=Revenue')

    expect(await screen.findByRole('tab', { name: 'Revenue' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(getTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Revenue' })
    )
  })

  it('falls back to All for an unsupported URL filter', async () => {
    renderPage('/transactions?type=Unknown')

    expect(await screen.findByRole('tab', { name: 'All' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(getTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'All' })
    )
  })
})
