import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import AddTransactionPage from './AddTransactionPage'

vi.mock('../../components/AddTransactionForm/AddTransactionForm', () => ({
  default: () => <div>Add transaction form</div>,
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { full_name: 'Test User' }, logout: vi.fn() }),
}))

/** Exposes the active URL for user-visible navigation assertions. */
const RouteProbe = () => {
  const location = useLocation()
  return <div data-testid="route">{location.pathname}{location.search}</div>
}

describe('UC-04 transaction tabs on the add page', () => {
  it.each([
    ['All', 'All'],
    ['Revenue', 'Revenue'],
    ['Expenses', 'Expense'],
  ])('makes %s interactive and returns to its transaction filter', async (label, type) => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/transactions/add']}>
        <RouteProbe />
        <Routes>
          <Route path="/transactions/add" element={<AddTransactionPage />} />
          <Route path="/transactions" element={<div>Transaction history</div>} />
        </Routes>
      </MemoryRouter>
    )

    await user.click(screen.getByRole('tab', { name: label }))

    expect(screen.getByTestId('route')).toHaveTextContent(
      `/transactions?type=${type}`
    )
  })
})
