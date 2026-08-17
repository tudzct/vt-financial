import axios from 'axios'
import React, { FormEvent, useEffect, useRef, useState } from 'react'
import { goalService } from '../../api/goal.service'
import { UpdatedGoalData } from '../../api/types'

const FIELD_ERROR = 'target_amount must be a positive number'
const SAVE_ERROR = 'Unable to save changes at this time. Please try again later.'

interface AdjustableGoal {
  goal_id: number
  target_amount: number
}

interface AdjustGoalModalProps {
  isOpen: boolean
  goal: AdjustableGoal | null
  onClose: () => void
  onUpdated: (goal: UpdatedGoalData) => void | Promise<void>
}

/** Updates only the selected goal's target amount. */
const AdjustGoalModal: React.FC<AdjustGoalModalProps> = ({
  isOpen,
  goal,
  onClose,
  onUpdated,
}) => {
  const [targetAmount, setTargetAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState('')
  const [apiError, setApiError] = useState('')
  const submissionInFlight = useRef(false)

  useEffect(() => {
    if (!isOpen) return
    setTargetAmount('')
    setFieldError('')
    setApiError('')
  }, [goal?.goal_id, isOpen])

  if (!isOpen || !goal) return null

  /** Closes the dialog without sending an update. */
  const handleClose = () => {
    if (submissionInFlight.current) return
    setTargetAmount('')
    setFieldError('')
    setApiError('')
    onClose()
  }

  /** Validates, persists, and applies one idempotent target replacement. */
  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submissionInFlight.current) return

    setFieldError('')
    setApiError('')
    const normalizedTargetAmount = Number(Number(targetAmount).toFixed(2))

    if (
      targetAmount.trim() === '' ||
      !Number.isFinite(normalizedTargetAmount) ||
      normalizedTargetAmount <= 0
    ) {
      setFieldError(FIELD_ERROR)
      return
    }

    submissionInFlight.current = true
    setIsSubmitting(true)

    try {
      const response = await goalService.updateGoal(goal.goal_id, {
        target_amount: Number(targetAmount),
      })
      await onUpdated(response.data.updated_goal)
      setTargetAmount('')
      setFieldError('')
      setApiError('')
      onClose()
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      const responseMessage = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string | string[] } | undefined)?.message
        : undefined
      const message = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : typeof responseMessage === 'string' && responseMessage.trim()
          ? responseMessage
          : SAVE_ERROR

      if (status === 400) setFieldError(message)
      else setApiError(message)
    } finally {
      submissionInFlight.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#222]/20 px-4 py-8 backdrop-brightness-75"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && handleClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-goal-title"
        className="relative w-full max-w-[480px] rounded-2xl bg-white px-12 pb-11 pt-14 shadow-[0_24px_55px_rgba(28,39,49,0.18)]"
      >
        <h2 id="adjust-goal-title" className="sr-only">Adjust financial goal</h2>
        <button
          type="button"
          aria-label="Close adjust goal modal"
          disabled={isSubmitting}
          onClick={handleClose}
          className="absolute right-7 top-5 text-3xl font-light leading-none text-[#555] disabled:opacity-40"
        >
          ×
        </button>

        <form onSubmit={handleSave} noValidate>
          <label className="block text-[13px] font-semibold text-[#5b5b5b]">
            Current Target Amount
            <input
              readOnly
              value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(goal.target_amount)}
              className="mt-2 h-14 w-full rounded-md border border-[#d8d8d8] bg-[#fafafa] px-5 text-sm text-[#888] outline-none"
            />
          </label>

          <label className="mt-5 block text-[13px] font-semibold text-[#5b5b5b]">
            New Target Amount
            <input
              autoFocus
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={targetAmount}
              onChange={(event) => {
                setTargetAmount(event.target.value)
                setFieldError('')
              }}
              placeholder="Enter a positive amount"
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? 'target-amount-error' : undefined}
              className={`mt-2 h-14 w-full rounded-md border px-5 text-sm text-[#555] outline-none transition focus:border-[#2fa69b] ${fieldError ? 'border-red-500' : 'border-[#d8d8d8]'}`}
            />
          </label>
          {fieldError && <p id="target-amount-error" className="mt-1.5 text-xs text-red-600">{fieldError}</p>}

          {apiError && <div role="alert" className="mt-5 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{apiError}</div>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mx-auto mt-8 flex h-12 w-[188px] items-center justify-center gap-2 rounded bg-[#2fa69b] text-sm font-semibold text-white transition hover:bg-[#278f86] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default AdjustGoalModal
