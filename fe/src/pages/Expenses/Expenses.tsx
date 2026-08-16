import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { NavLink, useNavigate } from 'react-router-dom'
import axiosInstance from '../../api/axiosInstance'
import ExpenseSummaryChart, {
  ExpenseSummaryItem,
} from '../../components/ExpenseSummaryChart/ExpenseSummaryChart'
import ExpensesBreakdown from '../../components/ExpensesBreakdown/ExpensesBreakdown'
import { useAuth } from '../../context/AuthContext'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const GENERAL_ERROR_MESSAGE = 'Unable to load expense data.'

const navItems = [
  ['Overview', '/dashboard', '▦'],
  ['Balances', '/accounts', '▣'],
  ['Transactions', '/transactions', '⇄'],
  ['Bills', '/bills', '▤'],
  ['Expenses', '/expenses', '▧'],
  ['Goals', '/goals', '◉'],
  ['Settings', '#', '⚙'],
] as const

interface ExpenseSummaryResponse {
  data: ExpenseSummaryItem[]
}

/** Implements Figma frame 109. Expenses (66:5698) and expense reporting flows. */
const ExpensesPage: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [summaryData, setSummaryData] = useState<ExpenseSummaryItem[]>([])
  const [chartData, setChartData] = useState<ExpenseSummaryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const isRequestInFlight = useRef(false)

  /** Fetches and expands the sparse API result for a complete chart year. */
  const fetchExpenseSummary = useCallback(async () => {
    if (isRequestInFlight.current) {
      return
    }

    const token = localStorage.getItem('token')
    if (!token || !user || !Number.isInteger(user.user_id) || user.user_id <= 0) {
      setSummaryData([])
      setChartData([])
      setError('Unauthorized')
      setIsLoading(false)
      return
    }

    isRequestInFlight.current = true
    setIsLoading(true)
    setError('')

    try {
      const response = await axiosInstance.get<ExpenseSummaryResponse>(
        '/v1/expenses/summary'
      )
      const sparseData = response.data.data

      if (!Array.isArray(sparseData)) {
        throw new Error(GENERAL_ERROR_MESSAGE)
      }

      const isValidSummary = sparseData.every(
        (item) =>
          MONTHS.includes(item.month as (typeof MONTHS)[number]) &&
          Number.isFinite(item.totalExpense)
      )

      if (!isValidSummary) {
        throw new Error(GENERAL_ERROR_MESSAGE)
      }

      setSummaryData(sparseData)

      if (sparseData.length === 0) {
        setChartData([])
      } else {
        const expensesByMonth = new Map(
          sparseData.map((item) => [item.month, item.totalExpense])
        )
        setChartData(
          MONTHS.map((month) => ({
            month,
            totalExpense: expensesByMonth.get(month) ?? 0,
          }))
        )
      }

      setError('')
    } catch (requestError) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message
        : requestError instanceof Error
          ? requestError.message
          : undefined

      setSummaryData([])
      setChartData([])
      setError(typeof message === 'string' ? message : GENERAL_ERROR_MESSAGE)
    } finally {
      isRequestInFlight.current = false
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchExpenseSummary()
    // The summary is fetched once for the authenticated page session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#55585e]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[280px] flex-col bg-[#171717] text-[#a7a7a7] lg:flex">
        <div className="px-14 pb-12 pt-12 text-[22px] font-extrabold tracking-[1.5px] text-white">
          FINEbank.IO
        </div>
        <nav className="space-y-1 px-7">
          {navItems.map(([label, path, icon]) =>
            path === '#' ? (
              <span key={label} className="flex items-center gap-4 rounded px-4 py-3 text-[14px]">
                <span className="w-5 text-center text-lg">{icon}</span>{label}
              </span>
            ) : (
              <NavLink
                key={label}
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-4 rounded px-4 py-3 text-[14px] transition-colors ${
                    isActive ? 'bg-[#299d91] font-semibold text-white' : 'hover:bg-white/5'
                  }`
                }
              >
                <span className="w-5 text-center text-lg">{icon}</span>{label}
              </NavLink>
            )
          )}
        </nav>

        <div className="mt-auto px-7 pb-8">
          <button
            type="button"
            onClick={handleLogout}
            className="mb-11 flex w-full items-center gap-4 rounded bg-[#252525] px-4 py-3 text-left text-sm text-[#d4d4d4]"
          >
            <span className="text-xl">↪</span> Logout
          </button>
          <div className="border-t border-[#2c2c2c] pt-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#414141] text-sm font-semibold text-white">
                {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.full_name || user?.username || 'User'}
                </p>
                <p className="text-[11px]">View profile</p>
              </div>
              <span className="text-xl text-white">⋮</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[280px]">
        <header className="flex h-[88px] items-center justify-between border-b border-[#e5e7e9] px-5 sm:px-7 lg:px-7">
          <p className="hidden text-[12px] text-[#a2a5aa] sm:block">≫&nbsp; May 19, 2023</p>
          <div className="ml-auto flex items-center gap-8">
            <span className="relative text-xl text-[#64676c]">
              ♟<span className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-[#299d91]" />
            </span>
            <label className="flex h-12 w-[350px] max-w-[58vw] items-center rounded-xl bg-white px-7 shadow-[0_16px_28px_rgba(34,40,50,0.06)]">
              <input
                type="search"
                placeholder="Search here"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a9abb0]"
              />
              <span className="text-xl text-[#282b30]">⌕</span>
            </label>
          </div>
        </header>

        <main className="mx-auto max-w-[1160px] px-5 pb-8 pt-5 sm:px-7">
          <h1 className="mb-4 text-[22px] font-normal text-[#7e8186]">Expenses Comparison</h1>
          <ExpenseSummaryChart
            data={chartData}
            isLoading={isLoading}
            error={error}
            hasNoData={!isLoading && !error && summaryData.length === 0}
          />

          <ExpensesBreakdown />
        </main>
      </div>
    </div>
  )
}

export default ExpensesPage
