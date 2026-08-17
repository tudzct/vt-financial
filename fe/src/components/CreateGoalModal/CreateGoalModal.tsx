import axios from 'axios'
import React, { FormEvent, useEffect, useRef, useState } from 'react'
import { categoryService } from '../../api/category.service'
import { goalService } from '../../api/goal.service'
import { Category, GoalType } from '../../api/types'

interface CreateGoalModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void | Promise<void>
}

interface GoalFormState {
  goalType: GoalType
  categoryId: string
  startDate: string
  endDate: string
  targetAmount: string
}

type FormErrors = Partial<Record<keyof GoalFormState, string>>

const INITIAL_FORM: GoalFormState = {
  goalType: 'Saving',
  categoryId: '',
  startDate: '',
  endDate: '',
  targetAmount: '',
}

const STORAGE_ERROR_MESSAGE =
  'Không thể tạo mục tiêu lúc này. Vui lòng thử lại sau.'

/** Checks a YYYY-MM-DD value without browser timezone conversion. */
const isValidCalendarDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Extracts the standard API error envelope without exposing request details. */
const getApiErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) return STORAGE_ERROR_MESSAGE

  const message = (error.response?.data as { message?: string | string[] } | undefined)
    ?.message

  if (Array.isArray(message)) return message.join(' ')
  return message || STORAGE_ERROR_MESSAGE
}

/** Creates Saving and Expense_Limit goals using the UC-14 modal flow. */
const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [form, setForm] = useState<GoalFormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submissionInFlight = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    setForm(INITIAL_FORM)
    setErrors({})
    setFormError('')
    setCategories([])
    setIsLoadingCategories(true)

    let isCurrent = true

    void categoryService
      .getCategories()
      .then((response) => {
        if (!isCurrent) return

        if (!response.success || !Array.isArray(response.data)) {
          throw new Error('Invalid category response')
        }

        setCategories(response.data)
      })
      .catch(() => {
        if (isCurrent) setFormError('Unable to load categories. Please try again.')
      })
      .finally(() => {
        if (isCurrent) setIsLoadingCategories(false)
      })

    return () => {
      isCurrent = false
    }
  }, [isOpen])

  if (!isOpen) return null

  /** Updates one controlled field and clears its stale validation message. */
  const updateField = <Key extends keyof GoalFormState>(
    field: Key,
    value: GoalFormState[Key]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'goalType' && value === 'Saving' ? { categoryId: '' } : {}),
    }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  /** Enforces BR-GOAL-04 through BR-GOAL-07 before contacting the API. */
  const validateForm = (): FormErrors => {
    const nextErrors: FormErrors = {}
    const targetAmount = Number(form.targetAmount)

    if (!form.targetAmount.trim()) {
      nextErrors.targetAmount = 'Target amount is required.'
    } else if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      nextErrors.targetAmount = 'Target amount must be greater than 0.'
    }

    if (!form.startDate) {
      nextErrors.startDate = 'Start date is required.'
    } else if (!isValidCalendarDate(form.startDate)) {
      nextErrors.startDate = 'Enter a valid start date.'
    }

    if (!form.endDate) {
      nextErrors.endDate = 'End date is required.'
    } else if (!isValidCalendarDate(form.endDate)) {
      nextErrors.endDate = 'Enter a valid end date.'
    } else if (
      isValidCalendarDate(form.startDate) &&
      form.endDate <= form.startDate
    ) {
      nextErrors.endDate = 'End date must be later than start date.'
    }

    if (
      form.goalType === 'Expense_Limit' &&
      (!form.categoryId || Number(form.categoryId) <= 0)
    ) {
      nextErrors.categoryId = 'Category is required for an expense limit.'
    }

    return nextErrors
  }

  /** Persists one validated goal and prevents duplicate submissions. */
  const handleCreateGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submissionInFlight.current) return

    const nextErrors = validateForm()
    setErrors(nextErrors)
    setFormError('')

    if (Object.keys(nextErrors).length > 0) return

    submissionInFlight.current = true
    setIsSubmitting(true)

    try {
      const targetAmount =
        Math.round((Number(form.targetAmount) + Number.EPSILON) * 100) / 100
      const response = await goalService.createGoal({
        goal_type: form.goalType,
        category_id:
          form.goalType === 'Expense_Limit' ? Number(form.categoryId) : null,
        start_date: form.startDate,
        end_date: form.endDate,
        target_amount: targetAmount,
      })

      if (!response.success || !response.data?.goal_id) {
        throw new Error(STORAGE_ERROR_MESSAGE)
      }

      await onCreated()
      setForm(INITIAL_FORM)
    } catch (error: unknown) {
      setFormError(getApiErrorMessage(error))
    } finally {
      submissionInFlight.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#222]/20 px-4 py-8 backdrop-brightness-75"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-goal-title"
        className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-2xl bg-white px-10 pb-9 pt-7 shadow-[0_24px_55px_rgba(28,39,49,0.18)]"
      >
        <div className="flex items-center justify-between">
          <h2 id="create-goal-title" className="text-lg font-semibold text-[#4b4b4b]">
            Create Goal
          </h2>
          <button
            type="button"
            aria-label="Close create goal modal"
            disabled={isSubmitting}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center text-3xl font-light leading-none text-[#555] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleCreateGoal} noValidate>
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-[#5b5b5b]">Goal Type</legend>
            <div className="grid grid-cols-2 rounded-md bg-[#f4f5f7] p-1">
              {(['Saving', 'Expense_Limit'] as GoalType[]).map((goalType) => (
                <button
                  key={goalType}
                  type="button"
                  aria-pressed={form.goalType === goalType}
                  onClick={() => updateField('goalType', goalType)}
                  className={`rounded px-3 py-2.5 text-sm font-medium transition ${
                    form.goalType === goalType
                      ? 'bg-[#2fa69b] text-white shadow-sm'
                      : 'text-[#777] hover:text-[#2b827a]'
                  }`}
                >
                  {goalType === 'Expense_Limit' ? 'Expense Limit' : 'Saving'}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-[#5b5b5b]">
              Target Amount
            </span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={form.targetAmount}
              onChange={(event) => updateField('targetAmount', event.target.value)}
              placeholder="$500000"
              aria-invalid={Boolean(errors.targetAmount)}
              className={`h-11 w-full rounded-md border px-4 text-sm text-[#555] outline-none transition placeholder:text-[#aaa] focus:border-[#2fa69b] ${
                errors.targetAmount ? 'border-red-500' : 'border-[#d8d8d8]'
              }`}
            />
            {errors.targetAmount && (
              <span className="mt-1 block text-xs text-red-600">{errors.targetAmount}</span>
            )}
          </label>

          {form.goalType === 'Expense_Limit' && (
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-[#5b5b5b]">
                Category
              </span>
              <select
                value={form.categoryId}
                disabled={isLoadingCategories}
                onChange={(event) => updateField('categoryId', event.target.value)}
                aria-invalid={Boolean(errors.categoryId)}
                className={`h-11 w-full rounded-md border bg-white px-4 text-sm text-[#666] outline-none transition focus:border-[#2fa69b] disabled:bg-[#f5f5f5] ${
                  errors.categoryId ? 'border-red-500' : 'border-[#d8d8d8]'
                }`}
              >
                <option value="">
                  {isLoadingCategories ? 'Loading categories...' : 'Select a category'}
                </option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <span className="mt-1 block text-xs text-red-600">{errors.categoryId}</span>
              )}
            </label>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-[#5b5b5b]">
                Start Date
              </span>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => updateField('startDate', event.target.value)}
                aria-invalid={Boolean(errors.startDate)}
                className={`h-11 w-full rounded-md border px-3 text-sm text-[#777] outline-none transition focus:border-[#2fa69b] ${
                  errors.startDate ? 'border-red-500' : 'border-[#d8d8d8]'
                }`}
              />
              {errors.startDate && (
                <span className="mt-1 block text-xs text-red-600">{errors.startDate}</span>
              )}
            </label>

            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-[#5b5b5b]">
                End Date
              </span>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(event) => updateField('endDate', event.target.value)}
                aria-invalid={Boolean(errors.endDate)}
                className={`h-11 w-full rounded-md border px-3 text-sm text-[#777] outline-none transition focus:border-[#2fa69b] ${
                  errors.endDate ? 'border-red-500' : 'border-[#d8d8d8]'
                }`}
              />
              {errors.endDate && (
                <span className="mt-1 block text-xs text-red-600">{errors.endDate}</span>
              )}
            </label>
          </div>

          {formError && (
            <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="h-11 min-w-[116px] rounded border border-[#2fa69b] px-5 text-sm font-semibold text-[#278f86] transition hover:bg-[#edf9f8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 min-w-[136px] rounded bg-[#2fa69b] px-6 text-sm font-semibold text-white transition hover:bg-[#278f86] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default CreateGoalModal
