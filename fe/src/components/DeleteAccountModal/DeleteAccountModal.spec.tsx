import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React, { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DeleteAccountModal from './DeleteAccountModal'

const { deleteAccount } = vi.hoisted(() => ({
  deleteAccount: vi.fn(),
}))

vi.mock('../../api/account.service', () => ({
  accountService: { deleteAccount },
}))

/** Keeps the component mounted when the parent closes it, as /accounts does. */
const BalancesHarness: React.FC<{
  onAutoComplete?: () => void | Promise<void>
}> = ({ onAutoComplete = vi.fn() }) => {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <DeleteAccountModal
      account={{
        id: 3,
        bankName: 'Vietcombank',
        accountNumberLast4: '3123',
      }}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onDeleted={vi.fn()}
      onAutoComplete={onAutoComplete}
    />
  )
}

describe('DeleteAccountModal success dismissal', () => {
  beforeEach(() => {
    deleteAccount.mockResolvedValue({
      message: 'Account deleted successfully',
      deleted_account_id: 3,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('unmounts the success state when Back to Balances closes it on /accounts', async () => {
    render(
      <MemoryRouter initialEntries={['/accounts']}>
        <BalancesHarness />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }))
    expect(
      await screen.findByText('Account Removed Successfully!')
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back to Balances' }))

    await waitFor(() => {
      expect(
        screen.queryByText('Account Removed Successfully!')
      ).not.toBeInTheDocument()
    })
  })

  it('closes after 1.5 seconds before refreshing the balances list', async () => {
    vi.useFakeTimers()
    const onAutoComplete = vi.fn()

    render(
      <MemoryRouter initialEntries={['/accounts']}>
        <BalancesHarness onAutoComplete={onAutoComplete} />
      </MemoryRouter>
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }))
    })

    expect(screen.getByText('Account Removed Successfully!')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(
      screen.queryByText('Account Removed Successfully!')
    ).not.toBeInTheDocument()
    expect(onAutoComplete).toHaveBeenCalledOnce()
  })
})
