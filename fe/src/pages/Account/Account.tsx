import axios from 'axios'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { accountService } from '../../api/account.service'
import { AccountListItem, AccountType } from '../../api/types'
import mastercardLogo from '../../assets/account/mastercard.png'
import visaLogo from '../../assets/account/visa.png'
import Loading from '../../components/Loading/Loading'
import DeleteAccountModal, {
  DeleteAccountTarget,
} from '../../components/DeleteAccountModal/DeleteAccountModal'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency } from '../../utils/format'

const GENERAL_ERROR_MESSAGE = 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.'
const ACCOUNT_TYPES: AccountType[] = [
  'Checking',
  'Credit Card',
  'Savings',
  'Investment',
  'Loan',
]

const NAVIGATION_ITEMS = [
  { path: '/dashboard', label: 'Overview', icon: '▦' },
  { path: '/accounts', label: 'Balances', icon: '▱' },
  { path: '/transactions', label: 'Transactions', icon: '↹' },
  { path: '/bills', label: 'Bills', icon: '▧' },
  { path: '/expenses', label: 'Expenses', icon: '▣' },
  { path: '/goals', label: 'Goals', icon: '◉' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

/** Confirms that a list row conforms to API-ACCOUNT-LIST. */
const isAccountListItem = (value: unknown): value is AccountListItem => {
  if (!value || typeof value !== 'object') return false

  const account = value as Partial<AccountListItem>
  return (
    Number.isInteger(account.id) &&
    Number(account.id) > 0 &&
    typeof account.bank_name === 'string' &&
    ACCOUNT_TYPES.includes(account.account_type as AccountType) &&
    (account.branch_name === null || typeof account.branch_name === 'string') &&
    typeof account.account_number_last_4 === 'string' &&
    /^\d{4}$/.test(account.account_number_last_4) &&
    Number.isFinite(Number(account.balance))
  )
}

/** Renders the Figma 105. Balances account-list experience for UC-05. */
const Account: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAccount, setSelectedAccount] =
    useState<DeleteAccountTarget | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const requestInFlight = useRef(false)

  /** Validates the local session and refreshes the owned accounts in place. */
  const fetchAccounts = useCallback(async () => {
    if (requestInFlight.current) return

    const token = localStorage.getItem('token')
    if (!token || !user || !Number.isInteger(user.user_id) || user.user_id <= 0) {
      setAccounts([])
      setError('Unauthorized')
      setIsLoading(false)
      return
    }

    requestInFlight.current = true
    setIsLoading(true)
    setError('')

    try {
      const response = await accountService.getAccountList()
      const data = response.data

      if (
        !response.success ||
        !data ||
        data.user_id !== user.user_id ||
        !Array.isArray(data.accounts) ||
        !data.accounts.every(isAccountListItem)
      ) {
        throw new Error(GENERAL_ERROR_MESSAGE)
      }

      setAccounts(data.accounts)
      setError('')
    } catch (requestError: unknown) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        const message = requestError.response.data?.message || 'Unauthorized'
        setError(Array.isArray(message) ? message.join(', ') : String(message))
        return
      }

      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || GENERAL_ERROR_MESSAGE
        : requestError instanceof Error
          ? requestError.message
          : GENERAL_ERROR_MESSAGE

      setAccounts([])
      setError(Array.isArray(message) ? message.join(', ') : String(message))
    } finally {
      requestInFlight.current = false
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchAccounts()
  }, [fetchAccounts])

  /** Clears authentication and returns to the login page. */
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  /** Opens the confirmation dialog for one validated account-list row. */
  const handleRemoveAccount = (account: AccountListItem) => {
    setSelectedAccount({
      id: account.id,
      bankName: account.bank_name,
      accountNumberLast4: account.account_number_last_4,
    })
    setIsDeleteModalOpen(true)
  }

  /** Closes the delete flow and clears its selected account. */
  const handleCloseDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false)
    setSelectedAccount(null)
  }, [])

  /** Removes the deleted row locally without changing authentication state. */
  const handleAccountDeleted = useCallback((accountId: number) => {
    setAccounts((current) =>
      current.filter((account) => account.id !== accountId)
    )
  }, [])

  /** Refreshes persisted balances after the success card delay. */
  const handleDeleteAutoComplete = useCallback(async () => {
    await fetchAccounts()
  }, [fetchAccounts])

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
              className={({ isActive }) =>
                `flex h-12 items-center gap-3 rounded-[4px] px-4 text-[16px] transition-colors ${
                  isActive
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
        <header className="flex h-[88px] items-center justify-between border-b border-[#e4e5e7] px-5 sm:px-8">
          <div className="hidden items-center gap-1 text-[14px] text-[#9f9f9f] sm:flex">
            <span className="text-[24px] leading-none" aria-hidden="true">»</span>
            <span>May 19, 2023</span>
          </div>
          <div className="ml-auto flex items-center gap-7 sm:gap-10">
            <button type="button" className="relative hidden h-6 w-6 sm:block" aria-label="Notifications">
              <span className="absolute left-1 top-1 h-4 w-4 rounded-t-full rounded-b-[3px] bg-[#555]" />
              <span className="absolute bottom-[2px] left-[10px] h-1 w-1 rounded-full bg-[#555]" />
              <span className="absolute right-0 top-0 h-2 w-2 rounded-full border border-[#f4f5f7] bg-[#299d91]" />
            </button>
            <label className="flex h-12 w-[350px] max-w-[76vw] items-center rounded-[12px] bg-white px-6 shadow-[0_13px_30px_rgba(106,22,58,0.04)] sm:px-8">
              <span className="sr-only">Search accounts</span>
              <input
                type="search"
                placeholder="Search here"
                className="min-w-0 flex-1 bg-transparent text-[16px] text-[#555] outline-none placeholder:text-[#9f9f9f]"
              />
              <span className="ml-4 text-[25px] leading-none text-[#3f3f3f]" aria-hidden="true">⌕</span>
            </label>
          </div>
        </header>

        <main className="px-5 pb-12 pt-4 sm:px-8">
          <h1 className="text-[22px] font-normal leading-8 text-[#878787]">Balances</h1>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <Loading message="Đang tải danh sách tài khoản..." />
            </div>
          ) : (
            <>
              {accounts.length === 0 && !error && (
                <div className="mt-6 rounded-lg border border-[#e6e6e6] bg-white px-6 py-8 text-center text-[#777] shadow-[0_20px_25px_rgba(76,103,100,0.07)]">
                  <p>Bạn chưa có tài khoản nào.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/accounts/add')}
                    className="mt-4 rounded-[4px] bg-[#299d91] px-6 py-3 font-semibold text-white hover:bg-[#278f87]"
                  >
                    Add Account
                  </button>
                </div>
              )}

              <section className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="Accounts">
                {accounts.map((account) => (
                  <article
                    key={account.id}
                    className="flex min-h-[304px] flex-col rounded-[8px] bg-white p-6 shadow-[0_20px_25px_rgba(76,103,100,0.1)]"
                  >
                    <div className="flex h-11 items-center justify-between gap-4 border-b border-[rgba(210,210,210,0.25)] pb-3">
                      <h2 className="truncate text-[16px] font-bold capitalize leading-6 text-[#878787]">
                        {account.account_type}
                      </h2>
                      <div className="flex min-w-0 items-center gap-1 text-right text-[12px] font-medium text-[#666]">
                        <span className="truncate">
                          {account.bank_name}
                        </span>
                        {account.account_type === 'Credit Card' && (
                          <img src={mastercardLogo} alt="Mastercard" className="h-8 w-12 shrink-0 object-contain" />
                        )}
                        {account.account_type === 'Checking' && (
                          <img src={visaLogo} alt="Visa" className="h-8 w-12 shrink-0 object-contain" />
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-1 flex-col gap-4">
                      <div>
                        <p className="text-[20px] font-semibold leading-7">**** {account.account_number_last_4}</p>
                        <p className="mt-1 text-[14px] leading-5 text-[#9f9f9f]">Account Number</p>
                      </div>
                      <div>
                        <p className="text-[20px] font-semibold leading-7">{formatCurrency(Number(account.balance))}</p>
                        <p className="mt-1 text-[14px] leading-5 text-[#9f9f9f]">Total amount</p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleRemoveAccount(account)}
                        className="text-[16px] text-[#299d91] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => navigate(`/accounts/${account.id}`)}
                        className="flex items-center gap-2 rounded-[4px] bg-[#299d91] px-5 py-2 text-[14px] font-medium text-white hover:bg-[#278f87] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Details <span aria-hidden="true">›</span>
                      </button>
                    </div>
                  </article>
                ))}

                <article className="flex min-h-[304px] items-center justify-center rounded-[8px] bg-white p-6 shadow-[0_20px_25px_rgba(76,103,100,0.1)]">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => navigate('/accounts/add')}
                      className="w-48 rounded-[4px] bg-[#299d91] px-8 py-3 text-[16px] font-bold text-white hover:bg-[#278f87] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add Accounts
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      className="w-48 px-6 py-3 text-[16px] font-medium text-[#9f9f9f] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Edit Accounts
                    </button>
                  </div>
                </article>
              </section>
            </>
          )}
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

export default Account
