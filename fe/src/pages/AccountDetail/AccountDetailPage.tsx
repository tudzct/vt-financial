import axios from 'axios'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { accountService } from '../../api/account.service'
import {
  AccountDetail,
  AccountDetailTransaction,
  AccountType,
  UpdatedAccount,
} from '../../api/types'
import Loading from '../../components/Loading/Loading'
import AccountEditForm from '../../components/AccountEditForm/AccountEditForm'
import DeleteAccountModal, {
  DeleteAccountTarget,
} from '../../components/DeleteAccountModal/DeleteAccountModal'
import { useAuth } from '../../context/AuthContext'

const INVALID_ACCOUNT_ID_MESSAGE = 'Invalid account ID.'
const AUTHENTICATION_ERROR_MESSAGE =
  'Unable to authenticate the user. Please log in again.'
const SYSTEM_ERROR_MESSAGE =
  'A system error occurred while retrieving the account details. Please try again later.'
const ACCOUNT_TYPES: AccountType[] = [
  'Checking',
  'Credit Card',
  'Savings',
  'Investment',
  'Loan',
]
const TRANSACTION_STATUSES = ['Complete', 'Pending', 'Failed'] as const
const TRANSACTION_TYPES = ['Revenue', 'Expense'] as const

const NAVIGATION_ITEMS = [
  { path: '/dashboard', label: 'Overview', icon: '▦' },
  { path: '/accounts', label: 'Balances', icon: '▱' },
  { path: '/transactions', label: 'Transactions', icon: '↹' },
  { path: '/bills', label: 'Bills', icon: '▧' },
  { path: '/expenses', label: 'Expenses', icon: '▣' },
  { path: '/goals', label: 'Goals', icon: '◉' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

/** Validates one recent-transaction row against API-ACCOUNT-DETAIL. */
const isAccountDetailTransaction = (
  value: unknown
): value is AccountDetailTransaction => {
  if (!value || typeof value !== 'object') return false

  const transaction = value as Partial<AccountDetailTransaction>
  return (
    typeof transaction.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(transaction.date) &&
    Number.isFinite(transaction.amount) &&
    typeof transaction.description === 'string' &&
    TRANSACTION_STATUSES.includes(
      transaction.status as (typeof TRANSACTION_STATUSES)[number]
    ) &&
    (transaction.receipt_id === null ||
      typeof transaction.receipt_id === 'string') &&
    TRANSACTION_TYPES.includes(
      transaction.type as (typeof TRANSACTION_TYPES)[number]
    )
  )
}

/** Validates the complete successful account-detail response payload. */
const isAccountDetail = (value: unknown): value is AccountDetail => {
  if (!value || typeof value !== 'object') return false

  const account = value as Partial<AccountDetail>
  return (
    Number.isSafeInteger(account.id) &&
    Number(account.id) > 0 &&
    typeof account.bank_name === 'string' &&
    ACCOUNT_TYPES.includes(account.account_type as AccountType) &&
    (account.branch_name === null || typeof account.branch_name === 'string') &&
    typeof account.account_number_full === 'string' &&
    Number.isFinite(account.balance) &&
    Array.isArray(account.recent_transactions) &&
    account.recent_transactions.length <= 5 &&
    account.recent_transactions.every(isAccountDetailTransaction)
  )
}

/** Formats a contract date without shifting it across timezone boundaries. */
const formatTransactionDate = (date: string): string => {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

/** Formats monetary values consistently with the supplied account-detail design. */
const formatAmount = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

/** Renders Figma frame 106. Account Details for UC-07. */
const AccountDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const requestInFlight = useRef(false)
  const [account, setAccount] = useState<AccountDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [selectedAccount, setSelectedAccount] =
    useState<DeleteAccountTarget | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  /** Validates the route and refreshes the account-detail data in place. */
  const fetchAccountDetails = useCallback(async () => {
    if (requestInFlight.current) return

    if (!id || !/^[1-9]\d*$/.test(id)) {
      setAccount(null)
      setError(INVALID_ACCOUNT_ID_MESSAGE)
      setIsLoading(false)
      return
    }

    const accountId = Number(id)
    if (!Number.isSafeInteger(accountId)) {
      setAccount(null)
      setError(INVALID_ACCOUNT_ID_MESSAGE)
      setIsLoading(false)
      return
    }

    if (!localStorage.getItem('token') || !user) {
      setAccount(null)
      setError(AUTHENTICATION_ERROR_MESSAGE)
      setIsLoading(false)
      return
    }

    requestInFlight.current = true
    setIsLoading(true)
    setError('')

    try {
      const response = await accountService.getAccountDetail(accountId)
      if (!response.success || response.message !== 'OK' || !isAccountDetail(response.data)) {
        throw new Error(SYSTEM_ERROR_MESSAGE)
      }

      setAccount(response.data)
      setError('')
    } catch (requestError: unknown) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || SYSTEM_ERROR_MESSAGE
        : requestError instanceof Error
          ? requestError.message
          : SYSTEM_ERROR_MESSAGE

      setAccount(null)
      setError(Array.isArray(message) ? message.join(', ') : String(message))
    } finally {
      requestInFlight.current = false
      setIsLoading(false)
    }
  }, [id, user])

  useEffect(() => {
    void fetchAccountDetails()
  }, [fetchAccountDetails])

  /** Clears the local session and returns to login. */
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  /** Applies the update response immediately, then refreshes persisted details. */
  const handleUpdateSuccess = async (updatedAccount: UpdatedAccount) => {
    setAccount((current) =>
      current
        ? {
            ...current,
            id: updatedAccount.account_id,
            bank_name: updatedAccount.bank_name,
            account_type: updatedAccount.account_type,
            branch_name: updatedAccount.branch_name,
            account_number_full: updatedAccount.account_number_full,
            balance: updatedAccount.balance,
          }
        : current
    )
    setIsEditing(false)
    await fetchAccountDetails()
  }

  /** Opens deletion confirmation for the loaded account. */
  const handleRemoveAccount = () => {
    if (!account) return

    setSelectedAccount({
      id: account.id,
      bankName: account.bank_name,
      accountNumberLast4: account.account_number_full.slice(-4),
    })
    setIsDeleteModalOpen(true)
  }

  /** Closes the delete flow and clears its selected account. */
  const handleCloseDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false)
    setSelectedAccount(null)
  }, [])

  /** Removes deleted account data from the current page immediately. */
  const handleAccountDeleted = useCallback(() => {
    setAccount(null)
  }, [])

  /** Returns to the refreshed balances route after the success delay. */
  const handleDeleteAutoComplete = useCallback(() => {
    navigate('/accounts')
  }, [navigate])

  const profileName = user?.full_name || user?.username || 'User'
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#191919] lg:flex">
      <aside className="hidden min-h-screen w-[280px] shrink-0 flex-col bg-[#171717] px-7 py-12 text-[#b8b8b8] lg:flex">
        <NavLink to="/dashboard" className="mb-12 px-7 text-[24px] font-extrabold tracking-[1.2px] text-white">
          FINE<span className="font-medium">bank.IO</span>
        </NavLink>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Primary navigation">
          {NAVIGATION_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={() =>
                `flex h-12 items-center gap-3 rounded-[4px] px-4 text-[16px] transition-colors ${
                  item.path === '/accounts'
                    ? 'bg-[#299d91] font-semibold text-white'
                    : 'hover:bg-[#252525] hover:text-white'
                }`
              }
            >
              <span className="w-6 text-center text-[21px] leading-none" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mb-11 flex h-12 items-center gap-3 rounded-[4px] bg-[#252525] px-4 text-left text-[16px] font-semibold text-[#c8c8c8] hover:text-white"
        >
          <span className="w-6 text-center text-[22px]" aria-hidden="true">↪</span>
          Logout
        </button>

        <div className="flex items-center border-t border-[#303030] pt-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4c4c4c] text-sm font-semibold text-white">
            {profileInitial}
          </div>
          <div className="ml-4 min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold text-white">{profileName}</p>
            <p className="text-xs text-[#9c9c9c]">View profile</p>
          </div>
          <span className="text-xl text-white" aria-hidden="true">⋮</span>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex min-h-[88px] items-center justify-between border-b border-[#e4e5e7] px-5 py-5 sm:px-8">
          <div className="hidden items-center gap-6 sm:flex">
            {isEditing && <h1 className="w-[140px] text-[24px] font-bold leading-7">Edit<br />Details</h1>}
            <div className="flex items-center gap-1 text-[14px] text-[#9f9f9f]">
              <span className="text-[24px] leading-none" aria-hidden="true">»</span>
              <span>May 19, 2023</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-7 sm:gap-10">
            <button type="button" className="relative hidden h-6 w-6 sm:block" aria-label="Notifications">
              <span className="absolute left-1 top-1 h-4 w-4 rounded-b-[3px] rounded-t-full bg-[#555]" />
              <span className="absolute bottom-[2px] left-[10px] h-1 w-1 rounded-full bg-[#555]" />
              <span className="absolute right-0 top-0 h-2 w-2 rounded-full border border-[#f4f5f7] bg-[#299d91]" />
            </button>
            <label className="flex h-12 w-[350px] max-w-[76vw] items-center rounded-[12px] bg-white px-6 shadow-[0_13px_30px_rgba(106,22,58,0.04)] sm:px-8">
              <span className="sr-only">Search</span>
              <input
                type="search"
                placeholder="Search here"
                className="min-w-0 flex-1 bg-transparent text-[16px] text-[#555] outline-none placeholder:text-[#9f9f9f]"
              />
              <span className="ml-4 text-[25px] leading-none text-[#3f3f3f]" aria-hidden="true">⌕</span>
            </label>
          </div>
        </header>

        <main className={isEditing ? 'px-5 pb-12 pt-8 sm:px-10' : 'px-5 pb-12 pt-4 sm:pl-6 sm:pr-8'}>
          {isEditing ? (
            <div className="flex items-center gap-2 text-[14px] leading-5">
              <button type="button" onClick={() => setIsEditing(false)} className="text-[#666]">Balances</button>
              <span className="text-[#9f9f9f]" aria-hidden="true">›</span>
              <span className="font-medium capitalize text-[#299d91]">Edit details</span>
            </div>
          ) : (
            <h1 className="text-[22px] font-normal leading-8 text-[#878787]">Account Details</h1>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          {isLoading && !isEditing ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <Loading message="Loading account details..." />
            </div>
          ) : account && isEditing ? (
            <div className="mt-6 flex w-full justify-center">
              <AccountEditForm
                account={account}
                onCancel={() => setIsEditing(false)}
                onSuccess={handleUpdateSuccess}
              />
            </div>
          ) : account ? (
            <>
              <section className="mt-4 min-h-[292px] rounded-[8px] bg-white px-8 py-9 shadow-[0_20px_25px_rgba(76,103,100,0.07)]">
                <div className="grid gap-y-11 sm:grid-cols-2 sm:gap-x-12 xl:grid-cols-[226px_226px_1fr] xl:gap-x-[94px]">
                  <div>
                    <p className="text-[14px] text-[#9f9f9f]">Bank Name</p>
                    <p className="text-[16px] font-semibold">{account.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-[14px] text-[#9f9f9f]">Account Type</p>
                    <p className="text-[16px] font-semibold">{account.account_type}</p>
                  </div>
                  <div>
                    <p className="text-[14px] text-[#9f9f9f]">Balance</p>
                    <p className="text-[16px] font-semibold">{formatAmount(account.balance)}</p>
                  </div>
                  <div>
                    <p className="text-[14px] text-[#9f9f9f]">Branch Name</p>
                    <p className="text-[16px] font-semibold">{account.branch_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[14px] text-[#9f9f9f]">Account Number</p>
                    <p className="text-[16px] font-semibold">**** {account.account_number_full.slice(-4)}</p>
                  </div>
                </div>

                <div className="mt-11 flex items-center gap-10">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    disabled={isLoading}
                    className="rounded-[4px] bg-[#299d91] px-9 py-3 text-[14px] font-semibold text-white hover:bg-[#278f87] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit Details
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleRemoveAccount}
                    className="px-1 py-3 text-[14px] text-[#9f9f9f] hover:text-[#666] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </section>

              <h2 className="mt-8 text-[22px] font-normal leading-8 text-[#878787]">Transactions History</h2>
              <section className="mt-12 overflow-hidden rounded-[8px] bg-white shadow-[0_20px_25px_rgba(76,103,100,0.07)]">
                {account.recent_transactions.length === 0 ? (
                  <p className="px-8 py-14 text-center text-[15px] text-[#878787]">No recent transactions.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-[#eeeeee] text-[14px] font-semibold">
                          <th className="px-8 py-5">Date</th>
                          <th className="px-6 py-5">Status</th>
                          <th className="px-6 py-5">Transaction Type</th>
                          <th className="px-6 py-5">Receipt</th>
                          <th className="px-8 py-5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {account.recent_transactions.map((transaction, index) => (
                          <tr key={`${transaction.date}-${transaction.receipt_id ?? index}-${index}`} className="border-b border-[#f0f0f0] last:border-0">
                            <td className="px-8 py-4 text-[14px] text-[#878787]">{formatTransactionDate(transaction.date)}</td>
                            <td className="px-6 py-4 text-[14px] text-[#878787]">{transaction.status}</td>
                            <td className={`px-6 py-4 text-[14px] font-semibold ${transaction.type === 'Revenue' ? 'text-[#299d91]' : 'text-[#d95c59]'}`}>
                              {transaction.type}
                            </td>
                            <td className="px-6 py-4 text-[14px] text-[#878787]">{transaction.receipt_id || '—'}</td>
                            <td className="px-8 py-4 text-right text-[14px] font-semibold">{formatAmount(transaction.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : null}
        </main>
      </div>

      <DeleteAccountModal
        account={selectedAccount}
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onDeleted={handleAccountDeleted}
        onAutoComplete={handleDeleteAutoComplete}
      />
    </div>
  )
}

export default AccountDetailPage
