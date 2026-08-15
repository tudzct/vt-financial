import React from 'react'
import Loading from '../Loading/Loading'

export interface ExpenseSummaryItem {
  month: string
  totalExpense: number
}

interface ExpenseSummaryChartProps {
  data: ExpenseSummaryItem[]
  isLoading: boolean
  error: string
  hasNoData: boolean
}

const formatAxisValue = (value: number) => {
  if (value >= 1_000_000) {
    return `$${Number((value / 1_000_000).toFixed(1))}m`
  }

  if (value >= 1_000) {
    return `$${Number((value / 1_000).toFixed(1))}k`
  }

  return `$${Math.round(value)}`
}

/** Renders the monthly expense comparison and its inline request states. */
const ExpenseSummaryChart: React.FC<ExpenseSummaryChartProps> = ({
  data,
  isLoading,
  error,
  hasNoData,
}) => {
  const highestExpense = Math.max(...data.map((item) => item.totalExpense), 0)
  const axisMaximum = highestExpense > 0 ? highestExpense : 1
  const axisLabels = [1, 0.75, 0.5, 0.25, 0].map((ratio) =>
    formatAxisValue(axisMaximum * ratio)
  )

  return (
    <section className="overflow-hidden rounded-lg bg-white shadow-[0_14px_25px_rgba(39,45,55,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-3 pt-5">
        <button
          type="button"
          disabled={isLoading}
          className="flex items-center gap-4 text-[14px] font-semibold text-[#24272c] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Monthly Comparison
          <span aria-hidden="true" className="text-lg font-normal">⌄</span>
        </button>

        <div className="flex items-center gap-6 text-[11px] text-[#575b62]">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-4 rounded-sm bg-[#299d91]" />
            This Week
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-4 rounded-sm bg-[#e7e7e7]" />
            Last Week
          </span>
        </div>
      </div>

      <div className="min-h-[224px] px-6 pb-5" aria-live="polite">
        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <Loading message="Loading expense summary..." />
          </div>
        ) : error ? (
          <div className="flex h-[200px] items-center justify-center rounded-md bg-red-50 px-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : hasNoData ? (
          <div className="flex h-[200px] items-center justify-center text-center text-sm text-[#8b8f96]">
            No expense data is available for the current year.
          </div>
        ) : (
          <div className="grid grid-cols-[54px_1fr] gap-3">
            <div className="flex h-[170px] flex-col justify-between pb-1 text-right text-[11px] text-[#9ca0a6]">
              {axisLabels.map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>

            <div>
              <div className="relative h-[170px] border-b border-[#eceef0] bg-[repeating-linear-gradient(to_bottom,#eceef0_0,#eceef0_1px,transparent_1px,transparent_42px)]">
                <div className="absolute inset-0 grid grid-cols-12 gap-2 px-2">
                  {data.map((item) => {
                    const height = `${Math.max(
                      (item.totalExpense / axisMaximum) * 100,
                      item.totalExpense > 0 ? 2 : 0
                    )}%`

                    return (
                      <div key={item.month} className="flex items-end justify-center gap-1">
                        <span
                          className="w-[42%] max-w-[17px] rounded-t bg-[#e7e7e7]"
                          style={{ height: item.totalExpense > 0 ? '2px' : '0' }}
                          aria-hidden="true"
                        />
                        <span
                          className="w-[42%] max-w-[17px] rounded-t bg-[#299d91] transition-[height] duration-300"
                          style={{ height }}
                          title={`${item.month}: ${item.totalExpense}`}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 px-2 pt-3 text-center text-[11px] text-[#9ca0a6]">
                {data.map((item) => (
                  <span key={item.month}>{item.month}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default ExpenseSummaryChart
