import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddTransactionForm from './AddTransactionForm'

const { getOwnedAccounts, getCategories, createTransaction } = vi.hoisted(() => ({
  getOwnedAccounts: vi.fn(),
  getCategories: vi.fn(),
  createTransaction: vi.fn(),
}))

vi.mock('../../api/account.service', () => ({
  accountService: { getOwnedAccounts },
}))
vi.mock('../../api/category.service', () => ({
  categoryService: { getCategories },
}))
vi.mock('../../api/transaction.service', () => ({
  transactionService: { createTransaction },
}))

/** Renders the form inside the router required by useNavigate. */
const renderForm = () =>
  render(
    <MemoryRouter>
      <AddTransactionForm />
    </MemoryRouter>
  )

describe('UC-04 transaction lookup controls', () => {
  beforeEach(() => {
    getOwnedAccounts.mockResolvedValue([
      {
        account_id: 3,
        user_id: 1,
        bank_name: 'Vietcombank',
        account_type: 'Checking',
        account_number_last_4: '0123',
        balance: 4_500_000,
      },
    ])
    getCategories.mockResolvedValue({
      success: true,
      message: 'OK',
      data: [{ category_id: 7, category_name: 'Entertainment' }],
    })
  })

  it('populates Account from the owned-account lookup', async () => {
    renderForm()
    const accountSelect = screen.getByRole('combobox', { name: /account/i })

    await waitFor(() =>
      expect(within(accountSelect).getByRole('option', {
        name: /vietcombank/i,
      })).toBeInTheDocument()
    )
  })

  it('populates optional Category from the category lookup', async () => {
    renderForm()
    const categorySelect = screen.getByRole('combobox', { name: /category/i })

    await waitFor(() =>
      expect(within(categorySelect).getByRole('option', {
        name: 'Entertainment',
      })).toBeInTheDocument()
    )
  })

  it('provides Payment Method as a selectable popup', () => {
    renderForm()

    const paymentSelect = screen.getByRole('combobox', {
      name: /payment method/i,
    })
    expect(within(paymentSelect).getAllByRole('option').length).toBeGreaterThan(1)
  })

  it('keeps Category optional when category loading fails', async () => {
    getCategories.mockRejectedValueOnce(new Error('offline'))
    renderForm()

    expect(await screen.findByText(/submit without a category/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save transaction/i })).toBeEnabled()
  })

  it('shows an error and prevents submission when account loading fails', async () => {
    const user = userEvent.setup()
    getOwnedAccounts.mockRejectedValueOnce(new Error('offline'))
    renderForm()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /save transaction/i }))

    expect(await screen.findByText('Select a valid owned account.')).toBeInTheDocument()
    expect(createTransaction).not.toHaveBeenCalled()
  })

  it('does not call the API when required client validation fails', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /save transaction/i }))

    expect(await screen.findByText('Select a valid owned account.')).toBeInTheDocument()
    expect(screen.getByText('Item description is required.')).toBeInTheDocument()
    expect(screen.getByText('Amount must be at least 0.01.')).toBeInTheDocument()
    expect(createTransaction).not.toHaveBeenCalled()
  })

  it('rejects an Expense larger than the selected account balance', async () => {
    const user = userEvent.setup()
    renderForm()
    const accountSelect = screen.getByRole('combobox', { name: /account/i })
    await waitFor(() => expect(within(accountSelect).getAllByRole('option')).toHaveLength(2))

    await user.selectOptions(accountSelect, '3')
    await user.type(screen.getByRole('spinbutton', { name: /amount/i }), '5000000')
    await user.click(screen.getByRole('button', { name: /save transaction/i }))

    expect(await screen.findByText(/cannot exceed the account balance/i)).toBeInTheDocument()
    expect(createTransaction).not.toHaveBeenCalled()
  })

  it('trims and submits the successful UC-04 payload exactly once', async () => {
    const user = userEvent.setup()
    createTransaction.mockResolvedValue({
      message: 'Transaction created successfully',
      data: {},
    })
    renderForm()
    const accountSelect = screen.getByRole('combobox', { name: /account/i })
    const categorySelect = screen.getByRole('combobox', { name: /category/i })
    await waitFor(() => expect(within(accountSelect).getAllByRole('option')).toHaveLength(2))
    await waitFor(() => expect(within(categorySelect).getAllByRole('option')).toHaveLength(2))

    await user.selectOptions(accountSelect, '3')
    await user.selectOptions(categorySelect, '7')
    await user.type(screen.getByRole('spinbutton', { name: /amount/i }), '150000')
    await user.type(screen.getByRole('textbox', { name: /item description/i }), '  Movie Ticket  ')
    await user.type(screen.getByRole('textbox', { name: /shop name/i }), '  Cinema  ')
    await user.type(screen.getByRole('textbox', { name: /payment method/i }), '  Credit Card  ')
    await user.click(screen.getByRole('button', { name: /save transaction/i }))

    await waitFor(() => expect(createTransaction).toHaveBeenCalledTimes(1))
    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 3,
        type: 'Expense',
        itemDescription: 'Movie Ticket',
        category_id: 7,
        shopName: 'Cinema',
        amount: 150000,
        paymentMethod: 'Credit Card',
        status: 'Complete',
      })
    )
  })
})
