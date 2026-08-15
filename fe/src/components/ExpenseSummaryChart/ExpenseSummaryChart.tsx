import axios from 'axios'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { expenseService } from '../../api/expense.service'
import { ExpenseSummaryItem } from '../../api/types'

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
]

const EMPTY_MONTHLY_SUMMARY: ExpenseSummaryItem[] = MONTHS.map((month) => ({
  month,
  totalExpense: 0,
}))

/** Safely converts the application's standard API error message into display text. */
const getApiMessage = (message: unknown): string | undefined => {
  if (typeof message === 'string') {
    return message
  }

  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join(', ')
  }

  return undefined
}

/** Applies BR-EXP-04 by rendering an ordered twelve-month expense comparison. */
const ExpenseSummaryChart: React.FC = () => {
  const [summaryData, setSummaryData] = useState<ExpenseSummaryItem[]>(EMPTY_MONTHLY_SUMMARY)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasExpenseData, setHasExpenseData] = useState(false)
  const activeRequestRef = useRef<AbortController | null>(null)

  /** Fetches and normalizes the idempotent expense-summary response once per active request. */
  const fetchExpenseSummary = useCallback(async () => {
    if (activeRequestRef.current) {
      return
    }

    const controller = new AbortController()
    activeRequestRef.current = controller
    setIsLoading(true)
    setError('')

    try {
      const response = await expenseService.getExpenseSummary(controller.signal)
      if (activeRequestRef.current !== controller) {
        return
      }

      const sourceData = response.success && Array.isArray(response.data) ? response.data : []
      const normalizedData = MONTHS.map((month) => {
        const matchingItem = sourceData.find((item) => item.month === month)
        const totalExpense = Number(matchingItem?.totalExpense ?? 0)

        return {
          month,
          totalExpense: Number.isFinite(totalExpense) ? totalExpense : 0,
        }
      })

      setSummaryData(normalizedData)
      setHasExpenseData(sourceData.length > 0)

      if (!response.success) {
        setError(response.message || 'Không thể tải dữ liệu chi tiêu.')
      }
    } catch (requestError: unknown) {
      if (activeRequestRef.current !== controller || axios.isCancel(requestError)) {
        return
      }

      const responseMessage = axios.isAxiosError(requestError)
        ? getApiMessage(requestError.response?.data?.message)
        : undefined
      setError(
        responseMessage || 'Không thể tải dữ liệu chi tiêu.',
      )
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void fetchExpenseSummary()

    return () => {
      activeRequestRef.current?.abort()
      activeRequestRef.current = null
    }
  }, [fetchExpenseSummary])

  const maximumExpense = Math.max(...summaryData.map((item) => item.totalExpense), 0)
  const chartMaximum = maximumExpense > 0 ? maximumExpense : 1
  const gridValues = Array.from({ length: 5 }, (_, index) =>
    (chartMaximum * (4 - index)) / 4,
  )

  /** Formats monetary labels without turning the numeric API values into strings. */
  const formatExpense = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
      notation: amount >= 1000 ? 'compact' : 'standard',
    }).format(amount)

  return (
    <section className="space-y-2">
      <h1 className="text-[22px] font-normal leading-8 text-[#878787]">Statistics</h1>

      <div className="rounded-lg bg-white px-6 pb-10 pt-4 shadow-[0_20px_25px_rgba(76,103,100,0.10)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 text-base font-semibold leading-6 text-[#191919]">
            <span className="sr-only">Comparison period</span>
            <select
              aria-label="Comparison period"
              className="appearance-none bg-transparent pr-7 text-base font-semibold leading-6 text-[#191919] outline-none disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              value="monthly"
              onChange={() => undefined}
            >
              <option value="monthly">Monthly Comparison</option>
            </select>
            <span aria-hidden="true" className="-ml-8 text-lg leading-none text-[#191919]">⌄</span>
          </label>

          <div className="flex items-center gap-6 text-xs font-medium leading-4 text-[#525256]">
            <span className="flex items-center gap-2">
              <span className="h-2 w-4 rounded-sm bg-[#299d91]" />
              Expense
            </span>
          </div>
        </div>

        <div className="mt-[14px]">
          {isLoading ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-[#525256]" role="status">
              Loading expense summary…
            </div>
          ) : error ? (
            <div className="flex h-[300px] items-center justify-center text-center text-sm text-red-600" role="alert">
              {error}
            </div>
          ) : !hasExpenseData ? (
            <div className="flex h-[300px] items-center justify-center text-center text-sm text-[#525256]">
              {/* BR-EXP-05 presents an empty-response state instead of an empty chart. */}
              No expense data is available for the current year.
            </div>
          ) : (
            <div className="overflow-x-auto pb-1">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-[48px_1fr] gap-4">
                  <div className="flex h-[248px] flex-col justify-between text-right text-sm leading-5 text-[#9f9f9f]">
                    {gridValues.map((value) => (
                      <span key={value}>{formatExpense(value)}</span>
                    ))}
                  </div>

                  <div className="relative h-[248px] border-b border-[#e8e8e8]">
                    {gridValues.map((value, index) => (
                      <div
                        key={`${value}-${index}`}
                        className="absolute left-0 right-0 border-t border-[#e8e8e8]"
                        style={{ top: `${index * 25}%` }}
                      />
                    ))}

                    <div className="absolute inset-x-0 bottom-0 flex h-full items-end justify-around gap-2 px-2">
                      {summaryData.map((item) => (
                        <div key={item.month} className="flex h-full w-[28px] items-end justify-center">
                          <div
                            aria-label={`${item.month}: ${formatExpense(item.totalExpense)}`}
                            className="w-4 rounded-t-[4px] bg-[#299d91] transition-[height] duration-200"
                            style={{ height: `${(item.totalExpense / chartMaximum) * 100}%` }}
                            title={`${item.month}: ${formatExpense(item.totalExpense)}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="ml-16 mt-[10px] flex justify-around gap-2 px-2 text-center text-sm leading-5 text-[#9f9f9f]">
                  {summaryData.map((item) => (
                    <span key={item.month} className="w-[28px]">{item.month}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default ExpenseSummaryChart
