import axios from 'axios'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  BreakdownResult,
  getExpensesBreakdown,
} from '../../api/expense.service'
import Loading from '../Loading/Loading'

const INVALID_MONTH_MESSAGE =
  'Tham số month không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM (ví dụ: 2025-11)'
const GENERAL_ERROR_MESSAGE = 'Không thể lấy dữ liệu breakdown chi tiêu.'

const categoryIcons: Record<string, string> = {
  Housing: '⌂',
  Food: '♜',
  Transportation: '▦',
  Entertainment: '▱',
  Shopping: '▢',
  Others: '▦',
  Uncategorized: '▦',
  Unknown: '?',
}

/** Formats money consistently with the supplied expenses design. */
const formatAmount = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

/** Formats an API date without shifting it through the client timezone. */
const formatExpenseDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number)

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

/** Validates the month picker value before an API request is sent. */
const validateMonth = (month: string) => {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return INVALID_MONTH_MESSAGE
  }

  const monthNumber = Number(month.slice(5, 7))
  return monthNumber >= 1 && monthNumber <= 12
    ? ''
    : INVALID_MONTH_MESSAGE
}

/** Renders the selected-month picker, request states, and category cards. */
const ExpensesBreakdown: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [expensesData, setExpensesData] = useState<BreakdownResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [noDataMessage, setNoDataMessage] = useState('')
  const inFlightMonth = useRef<string | null>(null)

  /** Fetches the selected month once and validates the response contract. */
  const fetchExpensesBreakdown = useCallback(
    async (signal?: AbortSignal) => {
      const validationMessage = validateMonth(selectedMonth)

      if (validationMessage) {
        setExpensesData([])
        setError(validationMessage)
        setNoDataMessage('')
        setIsLoading(false)
        return
      }

      if (inFlightMonth.current === selectedMonth) {
        return
      }

      inFlightMonth.current = selectedMonth
      setIsLoading(true)
      setError('')
      setNoDataMessage('')

      try {
        const response = await getExpensesBreakdown(selectedMonth, signal)
        const data = response.data.data
        const isValidResponse =
          Array.isArray(data) &&
          data.every(
            (item) =>
              typeof item.category === 'string' &&
              Number.isFinite(item.total) &&
              (item.changePercent === null ||
                Number.isFinite(item.changePercent)) &&
              Array.isArray(item.subCategories) &&
              item.subCategories.every(
                (detail) =>
                  typeof detail.item_description === 'string' &&
                  Number.isFinite(detail.amount) &&
                  /^\d{4}-\d{2}-\d{2}$/.test(detail.date)
              )
          )

        if (!isValidResponse) {
          throw new Error(GENERAL_ERROR_MESSAGE)
        }

        setExpensesData(data)
        setError('')
        setNoDataMessage('')
      } catch (requestError) {
        if (axios.isCancel(requestError)) {
          return
        }

        const status = axios.isAxiosError(requestError)
          ? requestError.response?.status
          : undefined
        const responseMessage = axios.isAxiosError(requestError)
          ? requestError.response?.data?.message
          : requestError instanceof Error
            ? requestError.message
            : undefined
        const message =
          typeof responseMessage === 'string'
            ? responseMessage
            : GENERAL_ERROR_MESSAGE

        setExpensesData([])

        if (status === 401) {
          setError('')
          setNoDataMessage('')
        } else if (status === 404) {
          setError('')
          setNoDataMessage(message)
        } else {
          setError(message)
          setNoDataMessage('')
        }
      } finally {
        if (!signal?.aborted) {
          inFlightMonth.current = null
          setIsLoading(false)
        }
      }
    },
    [selectedMonth]
  )

  useEffect(() => {
    const controller = new AbortController()
    void fetchExpensesBreakdown(controller.signal)

    return () => {
      controller.abort()
      inFlightMonth.current = null
    }
  }, [fetchExpensesBreakdown])

  const monthError = validateMonth(selectedMonth)

  return (
    <section aria-labelledby="expenses-breakdown-title">
      <div className="mb-4 mt-8 flex flex-wrap items-end justify-between gap-4">
        <h2
          id="expenses-breakdown-title"
          className="text-[22px] font-normal text-[#7e8186]"
        >
          Expenses Breakdown
        </h2>

        <label className="flex flex-col gap-1 text-xs font-medium text-[#66696e]">
          Month
          <input
            type="month"
            value={selectedMonth}
            disabled={isLoading}
            aria-invalid={Boolean(monthError)}
            aria-describedby={monthError ? 'expenses-month-error' : undefined}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="h-10 rounded-lg border border-[#d9dcdf] bg-white px-3 text-sm text-[#55585e] outline-none transition focus:border-[#299d91] focus:ring-2 focus:ring-[#299d91]/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {monthError && (
            <span
              id="expenses-month-error"
              className="max-w-[360px] text-[11px] font-normal text-red-600"
            >
              {monthError}
            </span>
          )}
        </label>
      </div>

      <div aria-live="polite">
        {isLoading ? (
          <div className="flex min-h-[230px] items-center justify-center rounded-lg bg-white shadow-[0_14px_25px_rgba(39,45,55,0.08)]">
            <Loading message="Đang tải dữ liệu chi tiêu..." />
          </div>
        ) : noDataMessage ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-lg bg-white px-6 text-center text-sm text-[#8b8f96] shadow-[0_14px_25px_rgba(39,45,55,0.08)]">
            {noDataMessage}
          </div>
        ) : error ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-red-200 bg-red-50 px-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {expensesData.map((category) => {
              const change = category.changePercent
              const trend =
                change === null || change === 0 ? null : change > 0 ? 'up' : 'down'

              return (
                <article
                  key={category.category}
                  className="overflow-hidden rounded-lg bg-white shadow-[0_14px_25px_rgba(39,45,55,0.08)]"
                >
                  <div className="flex min-h-[78px] items-center bg-[#e8e8e8] px-6">
                    <div className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#d3d3d3] text-xl text-[#6d7075]">
                      {categoryIcons[category.category] ?? '▦'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[#66696e]">
                        {category.category}
                      </p>
                      <p className="text-[18px] font-bold leading-tight text-[#202328]">
                        {formatAmount(category.total)}
                      </p>
                    </div>
                    <div className="ml-auto pl-3 text-right">
                      <p className="whitespace-nowrap text-sm font-semibold text-[#61646a]">
                        {change === null ? 'N/A' : `${Math.abs(change)}%`}{' '}
                        {trend && (
                          <span
                            className={
                              trend === 'up' ? 'text-[#ef5a5a]' : 'text-[#36aa72]'
                            }
                          >
                            {trend === 'up' ? '↑' : '↓'}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 whitespace-nowrap text-[10px] text-[#919398]">
                        Compare to last month
                      </p>
                    </div>
                  </div>

                  <div className="px-6">
                    {category.subCategories.map((detail, index) => (
                      <div
                        key={`${detail.date}-${detail.item_description}-${index}`}
                        className={`flex min-h-[76px] items-center justify-between gap-4 ${
                          index > 0 ? 'border-t border-[#ececec]' : ''
                        }`}
                      >
                        <p className="text-sm font-semibold text-[#5d6065]">
                          {detail.item_description}
                        </p>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-[#55585e]">
                            {formatAmount(detail.amount)}
                          </p>
                          <p className="mt-1 text-[10px] text-[#b0b2b6]">
                            {formatExpenseDate(detail.date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default ExpensesBreakdown
