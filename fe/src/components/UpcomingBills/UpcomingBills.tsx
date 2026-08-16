import axios from 'axios'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { billService } from '../../api/bill.service'
import { BillDto } from '../../api/types'
import Loading from '../Loading/Loading'

const FETCH_ERROR_MESSAGE = 'Failed to fetch bills'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Parses an API date-only value without applying a UTC timezone shift. */
const parseDateOnly = (value: string): Date => {
  if (!DATE_PATTERN.test(value)) throw new Error(FETCH_ERROR_MESSAGE)

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(FETCH_ERROR_MESSAGE)
  }
  return date
}

/** Verifies the normalized response fields needed by the bills presentation. */
const normalizeBill = (bill: BillDto): BillDto => {
  if (
    !Number.isInteger(bill.billId) ||
    !Number.isInteger(bill.userId) ||
    typeof bill.itemDescription !== 'string' ||
    !Number.isFinite(bill.amount) ||
    (bill.logoUrl !== null && typeof bill.logoUrl !== 'string') ||
    (bill.lastChargeDate !== null && typeof bill.lastChargeDate !== 'string')
  ) {
    throw new Error(FETCH_ERROR_MESSAGE)
  }

  parseDateOnly(bill.dueDate)
  if (bill.lastChargeDate) parseDateOnly(bill.lastChargeDate)
  return bill
}

/** Formats a normalized bill amount in the currency displayed by the design. */
const formatAmount = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)

/** Formats a normalized API date for the Last Charge column. */
const formatLastCharge = (value: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parseDateOnly(value))

/** Displays the UC-12 upcoming-bills list and its loading, empty, and error states. */
const UpcomingBills: React.FC = () => {
  const [bills, setBills] = useState<BillDto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeRequest = useRef<AbortController | null>(null)

  /** Fetches the idempotent bill list while preventing concurrent duplicate requests. */
  const fetchUpcomingBills = useCallback(async () => {
    if (activeRequest.current) return

    const controller = new AbortController()
    activeRequest.current = controller
    setIsLoading(true)
    setError(null)

    try {
      const response = await billService.getBills(controller.signal)
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error(FETCH_ERROR_MESSAGE)
      }

      // BR-BILL-04–05: render normalized rows or the successful empty state.
      setBills(response.data.map(normalizeBill))
      setError(null)
    } catch (requestError) {
      if (axios.isCancel(requestError)) return
      if (
        axios.isAxiosError(requestError) &&
        requestError.response?.status === 401
      )
        return

      const responseMessage = axios.isAxiosError<{
        message?: string | string[]
      }>(requestError)
        ? requestError.response?.data?.message
        : requestError instanceof Error
          ? requestError.message
          : null

      // BR-BILL-07: replace the list with the retrieval-error presentation.
      setBills([])
      setError(
        typeof responseMessage === 'string'
          ? responseMessage
          : FETCH_ERROR_MESSAGE
      )
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void fetchUpcomingBills()

    return () => {
      activeRequest.current?.abort()
      activeRequest.current = null
    }
  }, [fetchUpcomingBills])

  return (
    <section aria-labelledby="upcoming-bills-title">
      <h1
        id="upcoming-bills-title"
        className="mb-5 text-[22px] font-normal leading-7 text-[#8c8c8c] sm:text-2xl"
      >
        Upcoming Bills
      </h1>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_18px_28px_rgba(25,25,25,0.08)]">
        <div className="min-w-[960px] px-6">
          <div className="grid h-[70px] grid-cols-[112px_184px_minmax(320px,1fr)_220px_128px] items-center border-b border-[#f0f0f0] text-xs font-semibold text-[#191919]">
            <span>Due Date</span>
            <span>Logo</span>
            <span>Item Description</span>
            <span>Last Charge</span>
            <span className="text-right">Amount</span>
          </div>

          <div className="min-h-[248px]">
            {isLoading ? (
              <div className="flex min-h-[248px] items-center justify-center">
                <Loading message="Loading upcoming bills..." />
              </div>
            ) : error ? (
              <div className="flex min-h-[248px] flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm text-[#777777]">{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchUpcomingBills()}
                  disabled={isLoading}
                  className="rounded-lg bg-[#2fa69b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#278f86] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Retry
                </button>
              </div>
            ) : bills.length === 0 ? (
              <div className="flex min-h-[248px] items-center justify-center text-sm text-[#9b9b9b]">
                No upcoming bills
              </div>
            ) : (
              <div className="pb-6">
                {bills.map((bill, index) => {
                  const dueDate = parseDateOnly(bill.dueDate)
                  const dueMonth = new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                  }).format(dueDate)

                  return (
                    <article
                      key={bill.billId}
                      className={`grid min-h-[162px] grid-cols-[112px_184px_minmax(320px,1fr)_220px_128px] items-center ${
                        index < bills.length - 1
                          ? 'border-b border-[#f0f0f0]'
                          : ''
                      }`}
                    >
                      <time
                        dateTime={bill.dueDate}
                        className="flex h-[82px] w-[72px] flex-col items-center justify-center rounded-lg bg-[#f5f5f5] text-[#8f8f8f]"
                      >
                        <span className="text-sm font-medium">{dueMonth}</span>
                        <span className="mt-1 text-xl font-semibold text-[#4c4c4c]">
                          {dueDate.getDate()}
                        </span>
                      </time>

                      <div className="flex h-12 w-[136px] items-center">
                        {bill.logoUrl ? (
                          <img
                            src={bill.logoUrl}
                            alt={`${bill.itemDescription} logo`}
                            className="max-h-12 max-w-[136px] object-contain object-left"
                          />
                        ) : (
                          <span className="text-sm text-[#b0b0b0]">—</span>
                        )}
                      </div>

                      <p className="pr-10 text-sm font-semibold leading-5 text-[#191919]">
                        {bill.itemDescription}
                      </p>

                      <time
                        dateTime={bill.lastChargeDate ?? undefined}
                        className="text-sm text-[#a4a4a4]"
                      >
                        {bill.lastChargeDate
                          ? formatLastCharge(bill.lastChargeDate)
                          : '—'}
                      </time>

                      <span className="ml-auto flex h-12 min-w-[108px] items-center justify-center rounded-lg border border-[#e3e3e3] px-4 text-sm font-bold text-[#191919]">
                        {formatAmount(bill.amount)}
                      </span>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default UpcomingBills
