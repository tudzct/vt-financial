import axios from 'axios'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { savingsService } from '../../api/savings.service'
import { MonthlySavings } from '../../api/types'
import Loading from '../Loading/Loading'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const
const API_ERROR_MESSAGE =
  'An internal server error occurred while processing the savings summary.'
const YEAR_ERROR_MESSAGE = 'Year must be an integer between 1900 and 2100.'
const APPLICATION_TIME_ZONE = 'Asia/Ho_Chi_Minh'

const getCurrentYear = (): number =>
  Number(
    new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      timeZone: APPLICATION_TIME_ZONE,
    }).format(new Date())
  )

const formatAxisValue = (value: number): string => {
  const absoluteValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (absoluteValue >= 1_000_000) {
    return `${sign}$${Number((absoluteValue / 1_000_000).toFixed(1))}m`
  }

  if (absoluteValue >= 1_000) {
    return `${sign}$${Number((absoluteValue / 1_000).toFixed(1))}k`
  }

  return `${sign}$${Number(absoluteValue.toFixed(2))}`
}

const formatTooltipValue = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

interface SavingsTooltip {
  series: 'thisYear' | 'lastYear'
  month: string
  monthLabel: (typeof MONTHS)[number]
  amount: number
  x: number
  y: number
}

const isValidSeries = (series: MonthlySavings[]): boolean =>
  Array.isArray(series) &&
  series.length === 12 &&
  series.every(
    (item, index) =>
      item.month === String(index + 1).padStart(2, '0') &&
      Number.isFinite(item.amount)
  )

/** Displays the UC-16 selected-year and previous-year savings comparison. */
const SavingsSummaryChart: React.FC = () => {
  const currentYear = getCurrentYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [resolvedYear, setResolvedYear] = useState(currentYear)
  const [thisYear, setThisYear] = useState<MonthlySavings[]>([])
  const [lastYear, setLastYear] = useState<MonthlySavings[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [validationError, setValidationError] = useState('')
  const [tooltip, setTooltip] = useState<SavingsTooltip | null>(null)
  const requestInFlight = useRef(false)

  const years = useMemo(
    () => Array.from({ length: 11 }, (_, index) => currentYear - index),
    [currentYear]
  )

  /** Validates and fetches a snapshot without changing authenticated state. */
  const fetchSavingsSummary = useCallback(async () => {
    if (
      !Number.isInteger(selectedYear) ||
      selectedYear < 1900 ||
      selectedYear > 2100
    ) {
      setValidationError(YEAR_ERROR_MESSAGE)
      setError('')
      setIsLoading(false)
      return
    }

    if (requestInFlight.current) return

    requestInFlight.current = true
    setTooltip(null)
    setValidationError('')
    setError('')
    setIsLoading(true)

    try {
      const response = await savingsService.getSummary(selectedYear)

      if (
        !Number.isInteger(response.user_id) ||
        !Number.isInteger(response.year) ||
        response.year < 1900 ||
        response.year > 2100 ||
        !response.summary ||
        !isValidSeries(response.summary.this_year) ||
        !isValidSeries(response.summary.last_year)
      ) {
        throw new Error(API_ERROR_MESSAGE)
      }

      setResolvedYear(response.year)
      setThisYear(response.summary.this_year)
      setLastYear(response.summary.last_year)
    } catch (requestError: unknown) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        return
      }

      const apiMessage = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message
        : requestError instanceof Error
          ? requestError.message
          : undefined

      setThisYear([])
      setLastYear([])
      setError(typeof apiMessage === 'string' ? apiMessage : API_ERROR_MESSAGE)
    } finally {
      requestInFlight.current = false
      setIsLoading(false)
    }
  }, [selectedYear])

  useEffect(() => {
    void fetchSavingsSummary()
  }, [fetchSavingsSummary])

  const allValues = [...thisYear, ...lastYear].map((item) => item.amount)
  const hasNoData =
    !isLoading && !error && allValues.length === 24 && allValues.every((value) => value === 0)
  const rawMinimum = Math.min(0, ...allValues)
  const rawMaximum = Math.max(0, ...allValues)
  const valueRange = rawMaximum - rawMinimum || 1
  const axisPadding = valueRange * 0.08
  const axisMinimum = rawMinimum < 0 ? rawMinimum - axisPadding : 0
  const axisMaximum = rawMaximum > 0 ? rawMaximum + axisPadding : 1
  const chartRange = axisMaximum - axisMinimum
  const chartLeft = 66
  const chartRight = 672
  const chartTop = 14
  const chartBottom = 168
  const getX = (index: number) =>
    chartLeft + (index * (chartRight - chartLeft)) / 11
  const getY = (amount: number) =>
    chartBottom - ((amount - axisMinimum) / chartRange) * (chartBottom - chartTop)
  const thisYearPoints = thisYear.map((item, index) => `${getX(index)},${getY(item.amount)}`).join(' ')
  const lastYearPoints = lastYear.map((item, index) => `${getX(index)},${getY(item.amount)}`).join(' ')
  const areaPoints = thisYear.length === 12
    ? `${chartLeft},${chartBottom} ${thisYearPoints} ${chartRight},${chartBottom}`
    : ''
  const axisLabels = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4
    return axisMaximum - ratio * chartRange
  })
  const tooltipX = tooltip
    ? Math.min(chartRight - 112, Math.max(chartLeft, tooltip.x - 56))
    : 0
  const tooltipY = tooltip
    ? tooltip.y < chartTop + 42
      ? tooltip.y + 10
      : tooltip.y - 38
    : 0

  return (
    <section className="h-[294px] min-w-0 rounded-lg bg-white px-6 py-5 shadow-[0_14px_28px_rgba(28,39,49,0.08)]">
      <div className="flex min-h-9 flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="flex items-start gap-8">
          <h2 className="pt-1 text-base font-semibold text-[#444]">Saving Summary</h2>
          <div>
            <label htmlFor="savings-summary-year" className="sr-only">Savings summary year</label>
            <select
              id="savings-summary-year"
              value={selectedYear}
              disabled={isLoading}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="rounded border-0 bg-transparent py-1 pr-6 text-xs text-[#666] outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            {validationError && (
              <p className="mt-1 text-[10px] text-red-600" role="alert">{validationError}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 pt-1 text-[11px] text-[#666]">
          <span className="flex items-center gap-2">
            <i className="h-2 w-4 rounded-sm bg-[#2fa69b]" /> {resolvedYear}
          </span>
          <span className="flex items-center gap-2">
            <i className="h-2 w-4 rounded-sm bg-[#d8d8d8]" /> {resolvedYear - 1}
          </span>
        </div>
      </div>

      <div className="mt-2 flex h-[212px] items-center justify-center" aria-live="polite">
        {isLoading ? (
          <Loading message="Loading savings summary..." />
        ) : error ? (
          <p className="w-full rounded-md bg-red-50 px-6 py-8 text-center text-sm text-red-700">{error}</p>
        ) : hasNoData ? (
          <p className="text-center text-sm text-[#8b8f96]">No transaction data is available for these years.</p>
        ) : (
          <svg
            className="h-full w-full"
            viewBox="0 0 690 212"
            role="img"
            aria-label={`Monthly savings comparison for ${resolvedYear} and ${resolvedYear - 1}`}
            onMouseLeave={() => setTooltip(null)}
          >
            <defs>
              <linearGradient id="savings-summary-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2fa69b" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2fa69b" stopOpacity="0" />
              </linearGradient>
            </defs>
            {axisLabels.map((label, index) => {
              const y = chartTop + (index * (chartBottom - chartTop)) / 4
              return (
                <g key={index}>
                  <line x1={chartLeft} x2={chartRight} y1={y} y2={y} stroke="#eeeeee" />
                  <text x="55" y={y + 4} textAnchor="end" fill="#9b9b9b" fontSize="10">{formatAxisValue(label)}</text>
                </g>
              )
            })}
            {MONTHS.map((month, index) => (
              <g key={month}>
                <line x1={getX(index)} x2={getX(index)} y1={chartTop} y2={chartBottom} stroke="#ececec" />
                <text x={getX(index)} y="198" textAnchor="middle" fill="#999" fontSize="10">{month}</text>
              </g>
            ))}
            <polygon points={areaPoints} fill="url(#savings-summary-area)" />
            <polyline points={lastYearPoints} fill="none" stroke="#d8d8d8" strokeDasharray="5 4" strokeWidth="2" />
            <polyline points={thisYearPoints} fill="none" stroke="#2fa69b" strokeLinejoin="round" strokeWidth="2" />
            {lastYear.map((item, index) => {
              const point = {
                series: 'lastYear' as const,
                month: item.month,
                monthLabel: MONTHS[index],
                amount: item.amount,
                x: getX(index),
                y: getY(item.amount),
              }

              return (
                <circle
                  key={`last-year-${item.month}`}
                  role="graphics-symbol"
                  aria-label={`${resolvedYear - 1} ${point.monthLabel}: ${formatTooltipValue(item.amount)}`}
                  tabIndex={0}
                  cx={point.x}
                  cy={point.y}
                  r="9"
                  fill="transparent"
                  className="cursor-pointer outline-none"
                  onMouseEnter={() => setTooltip(point)}
                  onMouseLeave={() => setTooltip(null)}
                  onFocus={() => setTooltip(point)}
                  onBlur={() => setTooltip(null)}
                />
              )
            })}
            {thisYear.map((item, index) => {
              const point = {
                series: 'thisYear' as const,
                month: item.month,
                monthLabel: MONTHS[index],
                amount: item.amount,
                x: getX(index),
                y: getY(item.amount),
              }

              return (
                <circle
                  key={`this-year-${item.month}`}
                  role="graphics-symbol"
                  aria-label={`${resolvedYear} ${point.monthLabel}: ${formatTooltipValue(item.amount)}`}
                  tabIndex={0}
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="transparent"
                  className="cursor-pointer outline-none"
                  onMouseEnter={() => setTooltip(point)}
                  onMouseLeave={() => setTooltip(null)}
                  onFocus={() => setTooltip(point)}
                  onBlur={() => setTooltip(null)}
                />
              )
            })}
            {lastYear.map((item, index) => (
              <circle
                key={`last-year-marker-${item.month}`}
                cx={getX(index)}
                cy={getY(item.amount)}
                r="2.5"
                fill="#fff"
                stroke="#c8c8c8"
                pointerEvents="none"
              />
            ))}
            {thisYear.map((item, index) => (
              <circle
                key={`this-year-marker-${item.month}`}
                cx={getX(index)}
                cy={getY(item.amount)}
                r="2.5"
                fill="#fff"
                stroke="#2fa69b"
                pointerEvents="none"
              />
            ))}
            {tooltip && (
              <g
                role="tooltip"
                aria-label={`${tooltip.month} ${formatTooltipValue(tooltip.amount)}`}
                transform={`translate(${tooltipX} ${tooltipY})`}
                pointerEvents="none"
              >
                <rect
                  width="112"
                  height="28"
                  rx="5"
                  fill={tooltip.series === 'thisYear' ? '#237b74' : '#55585e'}
                  opacity="0.94"
                />
                <text x="56" y="18" textAnchor="middle" fill="#fff" fontSize="10">
                  {tooltip.monthLabel} · {formatTooltipValue(tooltip.amount)}
                </text>
              </g>
            )}
          </svg>
        )}
      </div>
    </section>
  )
}

export default SavingsSummaryChart
