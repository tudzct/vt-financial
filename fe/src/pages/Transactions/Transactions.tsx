import axios from 'axios'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { transactionService } from '../../api/transaction.service'
import { Transaction, TransactionFilterType } from '../../api/types'
import Loading from '../../components/Loading/Loading'
import { useAuth } from '../../context/AuthContext'

const PAGE_SIZE = 10
const FILTERS: Array<{ label: string; value: TransactionFilterType }> = [
  { label: 'All', value: 'All' },
  { label: 'Revenue', value: 'Revenue' },
  { label: 'Expenses', value: 'Expense' },
]
const DEFAULT_ERROR = 'Failed to load transactions. Please try again.'
const NAVIGATION_ITEMS = [
  { label: 'Overview', path: '/dashboard', icon: '⊞' },
  { label: 'Balances', path: '/account', icon: '▣' },
  { label: 'Transactions', path: '/transactions', icon: '↔' },
  { label: 'Bills', path: '/bills', icon: '▧' },
  { label: 'Expenses', path: '/expenses', icon: '▤' },
  { label: 'Goals', path: '/goals', icon: '◉' },
]

/** Displays and incrementally loads the authenticated user's transactions. */
const Transactions: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [filterType, setFilterType] = useState<TransactionFilterType>('All')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterError, setFilterError] = useState('')
  const [paginationError, setPaginationError] = useState('')
  const requestId = useRef(0)

  /** Validates and retrieves either the first or next transaction page. */
  const fetchTransactions = useCallback(
    async (requestedType: TransactionFilterType, requestedOffset: number) => {
      const allowedTypes: TransactionFilterType[] = ['All', 'Revenue', 'Expense']
      const invalidFilter = !allowedTypes.includes(requestedType)
      const invalidPagination =
        !Number.isInteger(PAGE_SIZE) ||
        PAGE_SIZE <= 0 ||
        !Number.isInteger(requestedOffset) ||
        requestedOffset < 0

      setFilterError(invalidFilter ? 'Invalid transaction filter.' : '')
      setPaginationError(invalidPagination ? 'Invalid pagination value.' : '')

      if (invalidFilter || invalidPagination) {
        setError('Invalid transaction query parameter')
        return
      }

      const currentRequestId = ++requestId.current
      setIsLoading(true)
      setError('')

      try {
        const response = await transactionService.getTransactions({
          type: requestedType,
          limit: PAGE_SIZE,
          offset: requestedOffset,
        })

        if (currentRequestId !== requestId.current) {
          return
        }

        const page = response.data ?? []
        setTransactions((currentTransactions) => {
          const combined = requestedOffset === 0 ? page : [...currentTransactions, ...page]
          const uniqueTransactions = Array.from(
            new Map(combined.map((transaction) => [transaction.transaction_id, transaction])).values(),
          )

          return uniqueTransactions.sort((first, second) => {
            const dateComparison = second.transaction_date.localeCompare(first.transaction_date)
            return dateComparison || second.transaction_id - first.transaction_id
          })
        })
        setTotal(response.total)
        setHasMore(response.hasMore)
        setOffset(requestedOffset + page.length)
      } catch (requestError: unknown) {
        if (currentRequestId !== requestId.current) {
          return
        }

        const apiMessage = axios.isAxiosError(requestError)
          ? requestError.response?.data?.message
          : undefined
        const normalizedMessage = Array.isArray(apiMessage) ? apiMessage.join(' ') : apiMessage
        setError(normalizedMessage || DEFAULT_ERROR)
      } finally {
        if (currentRequestId === requestId.current) {
          setIsLoading(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    setTransactions([])
    setTotal(0)
    setHasMore(false)
    setOffset(0)
    void fetchTransactions(filterType, 0)
  }, [fetchTransactions, filterType])

  /** Selects a filter while preventing duplicate requests. */
  const handleFilterChange = (nextFilter: TransactionFilterType) => {
    if (!isLoading && nextFilter !== filterType) {
      setFilterType(nextFilter)
    }
  }

  /** Ends the current session from the Figma-aligned sidebar. */
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  /** Formats a date-only API value without applying the browser timezone. */
  const formatDate = (dateValue: string) => {
    const [year, month, day] = dateValue.split('-').map(Number)
    if (!year || !month || !day) {
      return dateValue
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)))
  }

  /** Formats a signed VND amount using the project's monetary convention. */
  const formatAmount = (transaction: Transaction) => {
    const amount = Number(transaction.amount)
    const normalizedAmount = Number.isFinite(amount) ? Math.abs(amount) : 0
    const formattedAmount = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(normalizedAmount)

    return `${transaction.type === 'Revenue' ? '+' : '-'}${formattedAmount}`
  }

  const currentDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())
  const profileName = user?.full_name || user?.username || 'User'
  const profileInitial = profileName.charAt(0).toUpperCase()

  return (
    <div className="flex min-h-screen bg-[#f4f5f7] text-[#1e1f22]">
      <aside className="hidden min-h-screen w-[280px] shrink-0 flex-col bg-[#191919] px-7 pb-8 pt-[50px] text-[#a8a8aa] lg:flex">
        <NavLink to="/dashboard" className="px-3 text-[24px] font-bold tracking-[0.055em] text-white">
          FINE<span className="font-normal">bank.IO</span>
        </NavLink>

        <nav className="mt-[52px] space-y-[13px]" aria-label="Main navigation">
          {NAVIGATION_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex h-12 items-center gap-4 rounded-[4px] px-[18px] text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2fa79f] text-white'
                    : 'text-[#a8a8aa] hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <span aria-hidden="true" className="w-5 text-center text-[22px] leading-none">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            className="flex h-12 w-full items-center gap-4 rounded-[4px] px-[18px] text-left text-base font-medium text-[#a8a8aa] transition-colors hover:bg-white/5 hover:text-white"
          >
            <span aria-hidden="true" className="w-5 text-center text-xl">⌾</span>
            Settings
          </button>
        </nav>

        <div className="mt-auto">
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-12 w-full items-center gap-4 rounded-[4px] bg-[#252525] px-[18px] text-left text-base font-semibold text-[#c3c3c5] transition-colors hover:bg-[#2d2d2d] hover:text-white"
          >
            <span aria-hidden="true" className="w-5 text-center text-[22px]">↪</span>
            Logout
          </button>

          <div className="mt-11 border-t border-[#2b2b2b] pt-8">
            <div className="flex items-center gap-3 px-1">
              {user?.profile_picture_url ? (
                <img
                  src={user.profile_picture_url}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#353638] text-sm font-semibold text-white">
                  {profileInitial}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">{profileName}</p>
                <p className="text-xs text-[#929294]">View profile</p>
              </div>
              <span aria-hidden="true" className="text-2xl leading-none text-white">⋮</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-[88px] items-center justify-between border-b border-[#e4e5e7] bg-[#f4f5f7] px-6">
          <div className="flex items-center gap-3 text-sm text-[#a0a2a6]">
            <span aria-hidden="true" className="text-2xl leading-none text-[#a5a7aa]">»</span>
            <span>{currentDate}</span>
          </div>
          <div className="flex items-center gap-9">
            <span className="relative hidden h-9 w-9 items-center justify-center text-[#55575b] sm:flex" aria-label="Notifications">
              <span className="relative h-5 w-4 rounded-t-full border-2 border-[#55575b] border-b-0 before:absolute before:-bottom-1 before:left-[-4px] before:h-[2px] before:w-5 before:rounded-full before:bg-[#55575b] after:absolute after:-bottom-[6px] after:left-[5px] after:h-1 after:w-1 after:rounded-full after:bg-[#55575b]" />
              <span className="absolute right-[3px] top-[2px] h-2 w-2 rounded-full bg-[#2fa79f] ring-2 ring-[#f4f5f7]" />
            </span>
            <label className="flex h-12 w-[350px] max-w-[44vw] items-center rounded-[14px] bg-white px-6 shadow-[0_14px_30px_rgba(30,35,40,0.06)]">
              <span className="sr-only">Search transactions</span>
              <input
                type="search"
                placeholder="Search here"
                className="min-w-0 flex-1 bg-transparent text-base text-[#56585c] outline-none placeholder:text-[#a7a8ab]"
              />
              <span aria-hidden="true" className="ml-3 text-2xl text-[#4c4e52]">⌕</span>
            </label>
          </div>
        </header>

        <main className="px-6 pb-20 pt-5">
          <h1 className="text-[22px] font-normal tracking-[-0.01em] text-[#8b8d91]">
            Recent Transaction
          </h1>
          <span className="sr-only" aria-live="polite">
            {total} {total === 1 ? 'transaction' : 'transactions'}
          </span>
          <div
            className="mt-[27px] flex items-center gap-[42px]"
            role="tablist"
            aria-label="Transaction type"
          >
            {FILTERS.map((filter) => {
              const isActive = filterType === filter.value
              return (
                <button
                  key={filter.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  disabled={isLoading}
                  onClick={() => handleFilterChange(filter.value)}
                  className={`border-b-[3px] pb-[11px] text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    isActive
                      ? 'border-[#2fa79f] text-[#2fa79f]'
                      : 'border-transparent text-[#55575b] hover:text-[#2fa79f]'
                  }`}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
          {filterError && <p className="mt-2 text-xs text-red-600">{filterError}</p>}

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm"
            >
              {error}
            </div>
          )}

          <div className="mt-4 min-h-[702px] overflow-hidden rounded-2xl bg-white px-7 shadow-[0_18px_36px_rgba(31,41,55,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] table-fixed text-left">
              <thead>
                <tr className="h-[62px] border-b border-[#eeeeef] text-base font-bold text-[#202124]">
                  <th className="w-[27%] px-2">Items</th>
                  <th className="w-[24%] px-3">Shop Name</th>
                  <th className="w-[20%] px-3">Date</th>
                  <th className="w-[20%] px-3">Payment Method</th>
                  <th className="w-[9%] px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.transaction_id}
                    className="h-[72px] border-b border-[#eeeeef] last:border-b-0"
                  >
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-4">
                        <span
                          aria-hidden="true"
                          className="flex h-6 w-6 shrink-0 items-center justify-center text-lg font-semibold text-[#5e6064]"
                        >
                          {transaction.type === 'Revenue' ? '▣' : '▧'}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-[#202124]">
                            {transaction.item_description}
                          </p>
                          <span className="sr-only">Status: {transaction.status}</span>
                        </div>
                      </div>
                    </td>
                    <td className="truncate px-3 py-3 text-base text-[#66686c]">
                      {transaction.shop_name}
                    </td>
                    <td className="px-3 py-3 text-base text-[#66686c]">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="truncate px-3 py-3 text-base text-[#66686c]">
                      {transaction.payment_method}
                    </td>
                    <td className="px-2 py-3 text-right text-base font-bold text-[#202124]">
                      {formatAmount(transaction)}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>

            {!isLoading && transactions.length === 0 && !error && (
              <div className="flex min-h-[430px] items-center justify-center px-6 text-center">
                <div>
                  <p className="text-base font-semibold text-[#3d3f43]">No transactions found</p>
                  <p className="mt-2 text-sm text-[#888a8f]">
                    There are no transactions for the selected filter.
                  </p>
                </div>
              </div>
            )}

            <div className="flex min-h-[136px] flex-col items-center justify-center gap-3 px-6 py-6">
              {isLoading && <Loading size="sm" message="Loading transactions..." />}
              {(hasMore || isLoading) && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void fetchTransactions(filterType, offset)}
                  className="min-w-[190px] rounded-[4px] bg-[#2fa79f] px-8 py-[13px] text-base font-semibold text-white transition-colors hover:bg-[#278f88] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Load More
                </button>
              )}
              {paginationError && <p className="text-xs text-red-600">{paginationError}</p>}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Transactions
