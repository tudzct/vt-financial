import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { NavLink, useNavigate } from 'react-router-dom'
import axiosInstance from '../../api/axiosInstance'
import ExpenseSummaryChart, {
  ExpenseSummaryItem,
} from '../../components/ExpenseSummaryChart/ExpenseSummaryChart'
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

const breakdownItems = [
  {
    name: 'Housing',
    icon: '⌂',
    total: '$250.00',
    change: '15%',
    trend: 'up',
    entries: [['House Rent', '$230.00'], ['Parking', '$20.00']],
  },
  {
    name: 'Food',
    icon: '⌂',
    total: '$350.00',
    change: '08%',
    trend: 'down',
    entries: [['Grocery', '$230.00'], ['Restaurant bill', '$120.00']],
  },
  {
    name: 'Transportation',
    icon: '▦',
    total: '$50.00',
    change: '12%',
    trend: 'down',
    entries: [['Taxi Fare', '$30.00'], ['Metro Card bill', '$20.00']],
  },
  {
    name: 'Entertainment',
    icon: '▱',
    total: '$80.00',
    change: '15%',
    trend: 'down',
    entries: [['Movie ticket', '$30.00'], ['iTunes', '$50.00']],
  },
  {
    name: 'Shopping',
    icon: '▢',
    total: '$420.00',
    change: '25%',
    trend: 'up',
    entries: [['Shirt', '$230.00'], ['Jeans', '$190.00']],
  },
  {
    name: 'Others',
    icon: '▦',
    total: '$50.00',
    change: '23%',
    trend: 'up',
    entries: [['Donation', '$30.00'], ['Gift', '$20.00']],
  },
] as const

const navItems = [
  ['Overview', '/dashboard', '▦'],
  ['Balances', '/account', '▣'],
  ['Transactions', '/transactions', '⇄'],
  ['Bills', '/bills', '▤'],
  ['Expenses', '/expenses', '▧'],
  ['Goals', '/goals', '◉'],
  ['Settings', '#', '⚙'],
] as const

interface ExpenseSummaryResponse {
  data: ExpenseSummaryItem[]
}

/** Implements the Figma expenses dashboard and UC-10 summary flow. */
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

          <h2 className="mb-4 mt-8 text-[22px] font-normal text-[#7e8186]">Expenses Breakdown</h2>
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {breakdownItems.map((category) => (
              <article key={category.name} className="overflow-hidden rounded-lg bg-white shadow-[0_14px_25px_rgba(39,45,55,0.08)]">
                <div className="flex h-[78px] items-center bg-[#e8e8e8] px-6">
                  <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#d3d3d3] text-xl text-[#6d7075]">
                    {category.icon}
                  </div>
                  <div>
                    <p className="text-sm text-[#66696e]">{category.name}</p>
                    <p className="text-[18px] font-bold leading-tight text-[#202328]">{category.total}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm font-semibold text-[#61646a]">
                      {category.change}{' '}
                      <span className={category.trend === 'up' ? 'text-[#ef5a5a]' : 'text-[#36aa72]'}>
                        {category.trend === 'up' ? '↑' : '↓'}
                      </span>
                    </p>
                    <p className="mt-1 text-[10px] text-[#919398]">Compare to last month</p>
                  </div>
                </div>

                <div className="px-6">
                  {category.entries.map(([name, amount], index) => (
                    <div key={name} className={`flex min-h-[76px] items-center justify-between ${index > 0 ? 'border-t border-[#ececec]' : ''}`}>
                      <p className="text-sm font-semibold text-[#5d6065]">{name}</p>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#55585e]">{amount}</p>
                        <p className="mt-1 text-[10px] text-[#b0b2b6]">17 May 2023</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  )
}

export default ExpensesPage
