import axios from 'axios'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { transactionService } from '../../api/transaction.service'
import { Transaction, TransactionFilterType } from '../../api/types'
import Loading from '../../components/Loading/Loading'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency } from '../../utils/format'

const PAGE_LIMIT = 10
const FILTERS: Array<{ label: string; value: TransactionFilterType }> = [
  { label: 'All', value: 'All' },
  { label: 'Revenue', value: 'Revenue' },
  { label: 'Expenses', value: 'Expense' },
]

const NAVIGATION_ITEMS = [
  { path: '/dashboard', label: 'Overview', icon: '▦' },
  { path: '/account', label: 'Balances', icon: '▱' },
  { path: '/transactions', label: 'Transactions', icon: '↹' },
  { path: '/bills', label: 'Bills', icon: '▧' },
  { path: '/expenses', label: 'Expenses', icon: '▣' },
  { path: '/goals', label: 'Goals', icon: '◉' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

/** Formats a date-only API value without shifting it across time zones. */
const formatTransactionDate = (value: string): string => {
  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) return value

  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))

  return `${day} ${monthName}, ${year}`
}

/** Selects a compact item glyph from persisted transaction text. */
const getTransactionGlyph = (transaction: Transaction): string => {
  const description = transaction.item_description.toLowerCase()

  if (/food|pizza|biryani|restaurant|cafe/.test(description)) return '◇'
  if (/movie|ticket|cinema/.test(description)) return '▤'
  if (/taxi|uber|transport/.test(description)) return '▥'
  if (/shirt|fashion|bag|keyboard/.test(description)) return '▢'
  return transaction.type === 'Revenue' ? '↗' : '↘'
}

/** Renders the FINEbank transaction-history experience for UC-03. */
const TransactionsPage: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filterType, setFilterType] = useState<TransactionFilterType>('All')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const loadingRef = useRef(false)
  const requestIdRef = useRef(0)

  /** Displays a synchronized inline error and error toast. */
  const displayError = useCallback((message: string) => {
    setError(message)
    setToastMessage(message)
    setShowToast(true)
  }, [])

  /** Validates and loads either the first page or the next transaction page. */
  const fetchTransactions = useCallback(
    async (isNewFilter: boolean, requestedOffset: number) => {
      if (loadingRef.current) return

      const allowedFilters: TransactionFilterType[] = ['All', 'Revenue', 'Expense']
      const resolvedOffset = isNewFilter ? 0 : requestedOffset

      if (
        !allowedFilters.includes(filterType) ||
        !Number.isInteger(PAGE_LIMIT) ||
        PAGE_LIMIT <= 0 ||
        !Number.isInteger(resolvedOffset) ||
        resolvedOffset < 0
      ) {
        displayError('Invalid transaction query parameter')
        return
      }

      loadingRef.current = true
      setIsLoading(true)
      setError('')
      const requestId = ++requestIdRef.current

      try {
        const response = await transactionService.getTransactions({
          type: filterType,
          limit: PAGE_LIMIT,
          offset: resolvedOffset,
        })

        if (requestId !== requestIdRef.current) return

        setTransactions((current) =>
          isNewFilter ? response.data : [...current, ...response.data]
        )
        setOffset((current) =>
          isNewFilter ? response.data.length : current + response.data.length
        )
        setHasMore(response.hasMore)
      } catch (caughtError: unknown) {
        if (axios.isAxiosError(caughtError) && caughtError.response?.status === 401) return

        const message = axios.isAxiosError(caughtError)
          ? caughtError.response?.data?.message ||
            'Đã có lỗi xảy ra. Vui lòng thử lại sau.'
          : 'Đã có lỗi xảy ra. Vui lòng thử lại sau.'

        displayError(Array.isArray(message) ? message.join(', ') : String(message))
      } finally {
        if (requestId === requestIdRef.current) {
          loadingRef.current = false
          setIsLoading(false)
        }
      }
    },
    [displayError, filterType]
  )

  useEffect(() => {
    setTransactions([])
    setOffset(0)
    setHasMore(false)
    void fetchTransactions(true, 0)
  }, [fetchTransactions])

  useEffect(() => {
    if (!showToast) return

    const timeoutId = window.setTimeout(() => setShowToast(false), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [showToast, toastMessage])

  /** Clears local authentication and returns to login. */
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const profileName = user?.full_name || user?.username || 'Tanzir Rahman'
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'T'

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#1b1b1b] lg:flex">
      <aside className="hidden min-h-screen w-[276px] shrink-0 flex-col bg-[#171717] px-7 py-12 text-[#b8b8b8] lg:flex">
        <NavLink to="/dashboard" className="mb-12 pl-7 text-[25px] font-extrabold tracking-[1.2px] text-white">
          FINE<span className="font-medium">bank.IO</span>
        </NavLink>

        <nav className="flex flex-1 flex-col gap-3" aria-label="Primary navigation">
          {NAVIGATION_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex h-12 items-center gap-4 rounded-[4px] px-5 text-[16px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2ca59b] text-white'
                    : 'hover:bg-[#252525] hover:text-white'
                }`
              }
            >
              <span className="w-5 text-center text-[23px] leading-none" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mb-11 flex h-12 items-center gap-4 rounded-[4px] bg-[#252525] px-5 text-left text-[16px] font-semibold text-[#c8c8c8] hover:text-white"
        >
          <span className="w-5 text-center text-[23px]" aria-hidden="true">↪</span>
          Logout
        </button>

        <div className="flex items-center border-t border-[#303030] pt-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4c4c4c] text-sm font-semibold text-white">
            {profileInitial}
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-white">{profileName}</p>
            <p className="text-xs text-[#9c9c9c]">View profile</p>
          </div>
          <span className="text-xl text-white" aria-hidden="true">⋮</span>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-[86px] items-center justify-between border-b border-[#e4e5e7] px-5 sm:px-8">
          <div className="flex items-center gap-3 text-sm text-[#a1a1a1] sm:text-[15px]">
            <span className="text-[27px] leading-none" aria-hidden="true">»</span>
            <span>May 19, 2023</span>
          </div>
          <div className="flex items-center gap-7">
            <button type="button" className="relative hidden h-6 w-6 sm:block" aria-label="Notifications">
              <span className="absolute left-1 top-1 h-4 w-4 rounded-t-full rounded-b-[3px] bg-[#555]" />
              <span className="absolute bottom-[2px] left-[10px] h-1 w-1 rounded-full bg-[#555]" />
              <span className="absolute right-0 top-0 h-2 w-2 rounded-full border border-[#f4f5f7] bg-[#2ca59b]" />
            </button>
            <label className="flex h-12 w-[250px] items-center rounded-[14px] bg-white px-8 shadow-[0_10px_30px_rgba(33,33,33,0.04)] sm:w-[346px]">
              <span className="sr-only">Search transactions</span>
              <input
                type="search"
                placeholder="Search here"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-[#555] outline-none placeholder:text-[#aaa]"
              />
              <span className="ml-4 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#4d4d4d] text-[10px] text-[#4d4d4d]" aria-hidden="true">⌕</span>
            </label>
          </div>
        </header>

        <main className="px-5 pb-16 pt-5 sm:px-8">
          <h1 className="text-[23px] font-normal text-[#8e8e8e]">Recent Transaction</h1>

          <div className="mt-5 flex gap-7" role="tablist" aria-label="Transaction type">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={filterType === filter.value}
                disabled={isLoading}
                onClick={() => setFilterType(filter.value)}
                className={`border-b-2 px-2 pb-3 text-[16px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  filterType === filter.value
                    ? 'border-[#2ca59b] text-[#2ca59b]'
                    : 'border-transparent text-[#4d4d4d]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <section className="mt-4 min-h-[690px] overflow-hidden rounded-[16px] bg-white px-4 pb-8 pt-3 shadow-[0_17px_38px_rgba(30,35,40,0.08)] sm:px-7">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] table-fixed">
                <thead>
                  <tr className="border-b border-[#ececec] text-left text-[16px] font-semibold">
                    <th className="w-[28%] px-2 py-4">Items</th>
                    <th className="w-[23%] px-2 py-4">Shop Name</th>
                    <th className="w-[21%] px-2 py-4">Date</th>
                    <th className="w-[19%] px-2 py-4">Payment Method</th>
                    <th className="w-[9%] px-2 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && transactions.length === 0
                    ? Array.from({ length: 7 }).map((_, index) => (
                        <tr key={index} className="h-[71px] border-b border-[#efefef] last:border-0">
                          {[36, 60, 52, 60, 72].map((width, cellIndex) => (
                            <td key={cellIndex} className="px-2">
                              <div
                                className="h-4 animate-pulse rounded bg-[#eceeef]"
                                style={{ width: `${width}%` }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))
                    : transactions.map((transaction) => (
                        <tr key={transaction.transaction_id} className="h-[71px] border-b border-[#efefef] last:border-0">
                          <td className="px-2 text-[16px] font-semibold">
                            <div className="flex items-center gap-4">
                              <span className="flex h-6 w-6 items-center justify-center text-[23px] font-normal text-[#575757]" aria-hidden="true">
                                {getTransactionGlyph(transaction)}
                              </span>
                              <span className="truncate">{transaction.item_description}</span>
                            </div>
                          </td>
                          <td className="truncate px-2 text-[16px] text-[#686868]">{transaction.shop_name}</td>
                          <td className="px-2 text-[16px] text-[#686868]">{formatTransactionDate(transaction.transaction_date)}</td>
                          <td className="truncate px-2 text-[16px] text-[#686868]">{transaction.payment_method}</td>
                          <td className={`px-2 text-right text-[16px] font-semibold ${transaction.type === 'Revenue' ? 'text-[#2ca59b]' : 'text-[#1f1f1f]'}`}>
                            {transaction.type === 'Revenue' ? '+' : '-'}{formatCurrency(Math.abs(Number(transaction.amount)))}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {!isLoading && transactions.length === 0 && !error && (
              <div className="flex min-h-[470px] items-center justify-center text-[#777]">
                No transactions found.
              </div>
            )}

            {isLoading && transactions.length > 0 && (
              <div className="flex justify-center py-8">
                <Loading size="sm" message="Đang tải thêm..." />
              </div>
            )}

            {!isLoading && hasMore && (
              <div className="flex justify-center py-12">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void fetchTransactions(false, offset)}
                  className="h-12 min-w-[190px] rounded-[4px] bg-[#2ca59b] px-8 text-[16px] font-semibold text-white transition-colors hover:bg-[#278f87] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Load More
                </button>
              </div>
            )}
          </section>
        </main>
      </div>

      {showToast && (
        <div className="fixed right-5 top-5 z-50 max-w-sm rounded-lg border border-red-200 bg-white px-5 py-4 text-sm text-red-700 shadow-xl" role="alert">
          <div className="flex items-start gap-3">
            <span className="font-bold" aria-hidden="true">!</span>
            <p className="flex-1">{toastMessage}</p>
            <button type="button" onClick={() => setShowToast(false)} aria-label="Close error notification">×</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionsPage
