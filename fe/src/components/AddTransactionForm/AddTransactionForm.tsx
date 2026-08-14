import axios from 'axios'
import React, { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountService } from '../../api/account.service'
import { categoryService } from '../../api/category.service'
import { transactionService } from '../../api/transaction.service'
import {
  Account,
  Category,
  CreateTransactionPayload,
} from '../../api/types'

type TransactionType = 'Revenue' | 'Expense'

interface FormValues {
  accountId: string
  transactionDate: string
  type: TransactionType
  itemDescription: string
  categoryId: string
  shopName: string
  amount: string
  paymentMethod: string
}

type FieldErrors = Partial<Record<keyof FormValues, string>>

const SYSTEM_ERROR_MESSAGE =
  'Đã xảy ra lỗi hệ thống khi tạo giao dịch. Vui lòng thử lại sau.'

/** Returns today's calendar date without converting through UTC. */
const getLocalDate = (): string => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Builds the initial UC-04 form state. */
const getInitialValues = (): FormValues => ({
  accountId: '',
  transactionDate: getLocalDate(),
  type: 'Expense',
  itemDescription: '',
  categoryId: '',
  shopName: '',
  amount: '',
  paymentMethod: '',
})

/** Resolves either supported account-list identifier mapping. */
const getAccountId = (account: Account): number =>
  Number(account.account_id ?? account.id)

/** Checks a real ISO date-only value without shifting time zones. */
const isValidDateOnly = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.toISOString().slice(0, 10) === value
}

/** Extracts the global exception message from an Axios failure. */
const getErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) return SYSTEM_ERROR_MESSAGE

  const message = error.response?.data?.message
  if (Array.isArray(message)) return message.join(', ')
  return typeof message === 'string' && message.trim()
    ? message
    : SYSTEM_ERROR_MESSAGE
}

/** Implements validated UC-04 entry, lookup, submission, and feedback. */
const AddTransactionForm: React.FC = () => {
  const navigate = useNavigate()
  const [values, setValues] = useState<FormValues>(getInitialValues)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [lookupError, setLookupError] = useState('')
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const navigationTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let isMounted = true

    /** Loads required accounts and optional categories independently. */
    const loadLookups = async () => {
      const [accountResult, categoryResult] = await Promise.allSettled([
        accountService.getOwnedAccounts(),
        categoryService.getCategories(),
      ])

      if (!isMounted) return

      const messages: string[] = []
      if (accountResult.status === 'fulfilled') {
        setAccounts(accountResult.value)
      } else {
        messages.push(getErrorMessage(accountResult.reason) || 'Unable to load accounts.')
      }

      if (categoryResult.status === 'fulfilled') {
        setCategories(categoryResult.value.data ?? [])
      } else {
        messages.push('Categories could not be loaded. You can submit without a category.')
      }

      setLookupError(messages.join(' '))
    }

    void loadLookups()
    return () => {
      isMounted = false
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current)
      }
    }
  }, [])

  /** Updates a field and clears its stale validation message. */
  const updateField = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  /** Enforces all client-applicable BR-TXN-08..12 constraints. */
  const validate = (): FieldErrors => {
    const nextErrors: FieldErrors = {}
    const accountId = Number(values.accountId)
    const categoryId = Number(values.categoryId)
    const amount = Number(values.amount)
    const selectedAccount = accounts.find(
      (account) => getAccountId(account) === accountId
    )

    if (!Number.isInteger(accountId) || accountId <= 0 || !selectedAccount) {
      nextErrors.accountId = 'Select a valid owned account.'
    }
    if (!isValidDateOnly(values.transactionDate)) {
      nextErrors.transactionDate = 'Enter a valid date in YYYY-MM-DD format.'
    }
    if (!['Revenue', 'Expense'].includes(values.type)) {
      nextErrors.type = 'Select Revenue or Expense.'
    }
    if (!values.itemDescription.trim()) {
      nextErrors.itemDescription = 'Item description is required.'
    }
    if (!values.shopName.trim()) {
      nextErrors.shopName = 'Shop name is required.'
    }
    if (!values.paymentMethod.trim()) {
      nextErrors.paymentMethod = 'Payment method is required.'
    }
    if (!Number.isFinite(amount) || amount < 0.01) {
      nextErrors.amount = 'Amount must be at least 0.01.'
    } else if (
      values.type === 'Expense' &&
      selectedAccount &&
      amount > Number(selectedAccount.balance)
    ) {
      nextErrors.amount = 'Expense amount cannot exceed the account balance.'
    }
    if (
      values.categoryId &&
      (!Number.isInteger(categoryId) ||
        categoryId <= 0 ||
        !categories.some((category) => category.category_id === categoryId))
    ) {
      nextErrors.categoryId = 'Select a valid category.'
    }

    return nextErrors
  }

  /** Sends one normalized request and prevents duplicate submissions. */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return

    const validationErrors = validate()
    setErrors(validationErrors)
    setFormError('')
    if (Object.keys(validationErrors).length > 0) return

    submittingRef.current = true
    setIsSubmitting(true)

    const amount = Math.round(Number(values.amount) * 100) / 100
    const payload: CreateTransactionPayload = {
      accountId: Number(values.accountId),
      transactionDate: values.transactionDate,
      type: values.type,
      itemDescription: values.itemDescription.trim(),
      shopName: values.shopName.trim(),
      amount,
      paymentMethod: values.paymentMethod.trim(),
      status: 'Complete',
      ...(values.categoryId ? { category_id: Number(values.categoryId) } : {}),
    }

    try {
      const response = await transactionService.createTransaction(payload)
      setToast({ type: 'success', message: response.message })
      setValues(getInitialValues())
      setErrors({})
      setFormError('')
      navigationTimerRef.current = window.setTimeout(
        () => navigate('/transactions'),
        1500
      )
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 401) return
      const message = getErrorMessage(error)
      setFormError(message)
      setToast({ type: 'error', message })
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const fieldClass = (field: keyof FormValues) =>
    `h-12 w-full rounded-md border bg-white px-4 text-sm text-[#383838] outline-none transition focus:border-[#2fa096] focus:ring-1 focus:ring-[#2fa096] ${
      errors[field] ? 'border-red-400' : 'border-[#d6d9db]'
    }`

  const renderError = (field: keyof FormValues) =>
    errors[field] ? <p className="mt-1 text-xs text-red-600">{errors[field]}</p> : null

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="min-h-[704px] rounded-2xl bg-white px-6 py-7 shadow-[0_12px_30px_rgba(31,36,41,0.10)] sm:px-8"
      >
        <h2 className="text-2xl font-semibold leading-normal text-[#1f1f1f]">Add Transaction</h2>
        <p className="mt-2 text-sm text-[#6b6b6b]">
          Enter the transaction details below. Fields marked * are required.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-[#333]">
            Transaction Type *
            <select value={values.type} onChange={(event) => updateField('type', event.target.value)} className={`mt-2 ${fieldClass('type')}`}>
              <option value="Expense">Expense</option>
              <option value="Revenue">Revenue</option>
            </select>
            {renderError('type')}
          </label>

          <label className="block text-sm font-semibold text-[#333]">
            Account *
            <select value={values.accountId} onChange={(event) => updateField('accountId', event.target.value)} className={`mt-2 ${fieldClass('accountId')}`}>
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={getAccountId(account)} value={getAccountId(account)}>
                  {account.bank_name} • {account.account_number_last_4 ?? account.account_type} — {Number(account.balance).toLocaleString()}
                </option>
              ))}
            </select>
            {renderError('accountId')}
          </label>

          <label className="block text-sm font-semibold text-[#333]">
            Amount *
            <input type="number" min="0.01" step="0.01" inputMode="decimal" value={values.amount} onChange={(event) => updateField('amount', event.target.value)} placeholder="0.00" className={`mt-2 ${fieldClass('amount')}`} />
            {renderError('amount')}
          </label>

          <label className="block text-sm font-semibold text-[#333]">
            Transaction Date *
            <input type="date" value={values.transactionDate} onChange={(event) => updateField('transactionDate', event.target.value)} className={`mt-2 ${fieldClass('transactionDate')}`} />
            {renderError('transactionDate')}
          </label>

          <label className="block text-sm font-semibold text-[#333]">
            Item Description *
            <input type="text" value={values.itemDescription} onChange={(event) => updateField('itemDescription', event.target.value)} placeholder="Enter transaction description" className={`mt-2 ${fieldClass('itemDescription')}`} />
            {renderError('itemDescription')}
          </label>

          <label className="block text-sm font-semibold text-[#333]">
            Shop Name *
            <input type="text" value={values.shopName} onChange={(event) => updateField('shopName', event.target.value)} placeholder="Enter shop or recipient name" className={`mt-2 ${fieldClass('shopName')}`} />
            {renderError('shopName')}
          </label>

          <label className="block text-sm font-semibold text-[#333]">
            Payment Method *
            <input type="text" value={values.paymentMethod} onChange={(event) => updateField('paymentMethod', event.target.value)} placeholder="Enter payment method" className={`mt-2 ${fieldClass('paymentMethod')}`} />
            {renderError('paymentMethod')}
          </label>

          <label className="block text-sm font-semibold text-[#333]">
            Category (Optional)
            <select value={values.categoryId} onChange={(event) => updateField('categoryId', event.target.value)} className={`mt-2 ${fieldClass('categoryId')}`}>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.category_id} value={category.category_id}>{category.category_name}</option>
              ))}
            </select>
            {renderError('categoryId')}
          </label>
        </div>

        {(lookupError || formError) && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {[lookupError, formError].filter(Boolean).join(' ')}
          </div>
        )}

        <div className="mt-4 flex h-12 items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/transactions')} disabled={isSubmitting} className="h-12 rounded border border-[#2fa096] bg-white px-6 text-sm font-semibold text-[#2fa096] hover:bg-[#f2fbfa] disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="flex h-12 min-w-[151px] items-center justify-center gap-2 rounded bg-[#2fa096] px-6 text-sm font-semibold text-white hover:bg-[#278f87] disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
            {isSubmitting ? 'Saving...' : 'Save Transaction'}
          </button>
        </div>
      </form>

      {toast && (
        <div className={`fixed right-5 top-5 z-50 max-w-sm rounded-lg border bg-white px-5 py-4 text-sm shadow-xl ${toast.type === 'success' ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700'}`} role="status">
          <div className="flex items-start gap-3">
            <span className="font-bold" aria-hidden="true">{toast.type === 'success' ? '✓' : '!'}</span>
            <p className="flex-1">{toast.message}</p>
            <button type="button" onClick={() => setToast(null)} aria-label="Close notification">×</button>
          </div>
        </div>
      )}
    </>
  )
}

export default AddTransactionForm
