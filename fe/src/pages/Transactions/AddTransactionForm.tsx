import axios from 'axios'
import React, { FormEvent, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { accountService } from '../../api/account.service'
import { categoryService } from '../../api/category.service'
import { transactionService } from '../../api/transaction.service'
import {
  Account,
  Category,
  CreateTransactionPayload,
} from '../../api/types'
import { useAuth } from '../../context/AuthContext'

type TransactionType = 'Revenue' | 'Expense'
type TransactionStatus = 'Complete' | 'Pending' | 'Failed'

interface FormErrors {
  accountId?: string
  transactionDate?: string
  type?: string
  itemDescription?: string
  shopName?: string
  amount?: string
  paymentMethod?: string
  categoryId?: string
  status?: string
}

const NAVIGATION_ITEMS = [
  { label: 'Overview', path: '/dashboard', icon: '⊞' },
  { label: 'Balances', path: '/account', icon: '▣' },
  { label: 'Transactions', path: '/transactions', icon: '↔' },
  { label: 'Bills', path: '/bills', icon: '▧' },
  { label: 'Expenses', path: '/expenses', icon: '▤' },
  { label: 'Goals', path: '/goals', icon: '◉' },
]
const DEFAULT_ERROR = 'Failed to create transaction. Please try again.'
const inputClassName =
  'mt-2 h-12 w-full rounded-[6px] border border-[#dedfe2] bg-white px-4 text-[15px] text-[#2b2d31] outline-none transition focus:border-[#2fa79f] focus:ring-2 focus:ring-[#2fa79f]/15 disabled:cursor-not-allowed disabled:bg-[#f1f2f4]'
const getToday = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Displays and submits the authenticated create-transaction form. */
const AddTransactionForm: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navigationTimer = useRef<number | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accountId, setAccountId] = useState('')
  const [transactionDate, setTransactionDate] = useState(getToday)
  const [type, setType] = useState<TransactionType>('Expense')
  const [itemDescription, setItemDescription] = useState('')
  const [shopName, setShopName] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState<TransactionStatus>('Complete')
  const [errors, setErrors] = useState<FormErrors>({})
  const [apiError, setApiError] = useState('')
  const [accountLoadError, setAccountLoadError] = useState('')
  const [categoryWarning, setCategoryWarning] = useState('')
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  useEffect(() => {
    let isMounted = true

    /** Loads required accounts and optional categories independently. */
    const loadOptions = async () => {
      setIsLoadingOptions(true)
      const [accountResult, categoryResult] = await Promise.allSettled([
        accountService.getAccounts(),
        categoryService.getCategories(),
      ])

      if (!isMounted) return

      if (accountResult.status === 'fulfilled') {
        const loadedAccounts = accountResult.value.data ?? []
        setAccounts(loadedAccounts)
        if (loadedAccounts.length === 1) {
          setAccountId(String(loadedAccounts[0].account_id))
        }
      } else {
        setAccountLoadError('Unable to load accounts. Please try again later.')
      }

      if (categoryResult.status === 'fulfilled') {
        setCategories(categoryResult.value.data ?? [])
      } else {
        setCategoryWarning(
          'Categories could not be loaded. You can still create a transaction without one.',
        )
      }

      setIsLoadingOptions(false)
    }

    void loadOptions()

    return () => {
      isMounted = false
      if (navigationTimer.current !== null) {
        window.clearTimeout(navigationTimer.current)
      }
    }
  }, [])

  /** Checks every client-applicable UC-04 field rule. */
  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {}
    const numericAccountId = Number(accountId)
    const numericAmount = Number(amount)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    const parsedDate = new Date(`${transactionDate}T00:00:00Z`)
    const isValidDate =
      datePattern.test(transactionDate) &&
      !Number.isNaN(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === transactionDate

    if (!Number.isInteger(numericAccountId) || numericAccountId < 1) {
      nextErrors.accountId = 'Please select an account.'
    }
    if (!isValidDate) {
      nextErrors.transactionDate = 'Please enter a valid transaction date.'
    }
    if (!['Revenue', 'Expense'].includes(type)) {
      nextErrors.type = 'Please select a valid transaction type.'
    }
    if (!itemDescription.trim()) {
      nextErrors.itemDescription = 'Item description is required.'
    } else if (itemDescription.trim().length > 500) {
      nextErrors.itemDescription = 'Item description must be 500 characters or fewer.'
    }
    if (!shopName.trim()) {
      nextErrors.shopName = 'Shop name is required.'
    } else if (shopName.trim().length > 255) {
      nextErrors.shopName = 'Shop name must be 255 characters or fewer.'
    }
    if (!amount || !Number.isFinite(numericAmount) || numericAmount < 0.01) {
      nextErrors.amount = 'Amount must be at least 0.01.'
    } else if (numericAmount > 9999999999999.99) {
      nextErrors.amount = 'Amount exceeds the supported monetary limit.'
    }
    if (!paymentMethod.trim()) {
      nextErrors.paymentMethod = 'Payment method is required.'
    } else if (paymentMethod.trim().length > 100) {
      nextErrors.paymentMethod = 'Payment method must be 100 characters or fewer.'
    }
    if (
      categoryId &&
      (!Number.isInteger(Number(categoryId)) || Number(categoryId) < 1)
    ) {
      nextErrors.categoryId = 'Please select a valid category.'
    }
    if (!['Complete', 'Pending', 'Failed'].includes(status)) {
      nextErrors.status = 'Please select a valid status.'
    }

    return nextErrors
  }

  /** Sends one normalized request and handles the complete success flow. */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validate()
    setErrors(nextErrors)
    setApiError('')
    if (Object.keys(nextErrors).length > 0) return

    const payload: CreateTransactionPayload = {
      accountId: Number(accountId),
      transactionDate,
      type,
      itemDescription: itemDescription.trim(),
      shopName: shopName.trim(),
      amount: Number(amount),
      paymentMethod: paymentMethod.trim(),
      status,
      ...(categoryId ? { category_id: Number(categoryId) } : {}),
    }

    setIsSubmitting(true)
    try {
      await transactionService.createTransaction(payload)
      setShowSuccessToast(true)
      setAccountId(accounts.length === 1 ? String(accounts[0].account_id) : '')
      setTransactionDate(getToday())
      setType('Expense')
      setItemDescription('')
      setShopName('')
      setAmount('')
      setPaymentMethod('')
      setCategoryId('')
      setStatus('Complete')
      setErrors({})
      setApiError('')
      setIsSubmitting(false)
      navigationTimer.current = window.setTimeout(
        () => navigate('/transactions'),
        1500,
      )
    } catch (requestError: unknown) {
      const responseMessage = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message
        : undefined
      const normalizedMessage = Array.isArray(responseMessage)
        ? responseMessage.join(' ')
        : responseMessage
      setApiError(
        typeof normalizedMessage === 'string' && normalizedMessage.trim()
          ? normalizedMessage
          : DEFAULT_ERROR,
      )
      setIsSubmitting(false)
    }
  }

  /** Ends the current authenticated session. */
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const profileName = user?.full_name || user?.username || 'User'
  const currentDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="flex min-h-screen bg-[#f4f5f7] text-[#1e1f22]">
      <aside className="hidden min-h-screen w-[280px] shrink-0 flex-col bg-[#191919] px-7 pb-8 pt-[50px] text-[#a8a8aa] lg:flex">
        <NavLink to="/dashboard" className="px-3 text-[24px] font-bold tracking-[0.055em] text-white">
          FINE<span className="font-normal">bank.IO</span>
        </NavLink>
        <nav className="mt-[52px] space-y-[13px]" aria-label="Main navigation">
          {NAVIGATION_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex h-12 items-center gap-4 rounded-[4px] px-[18px] text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2fa79f] text-white'
                    : 'text-[#a8a8aa] hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <span aria-hidden="true" className="w-5 text-center text-[22px] leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-12 w-full items-center gap-4 rounded-[4px] bg-[#252525] px-[18px] text-left text-base font-semibold text-[#c3c3c5] hover:bg-[#2d2d2d] hover:text-white"
          >
            <span aria-hidden="true" className="w-5 text-center text-[22px]">↪</span>
            Logout
          </button>
          <div className="mt-11 border-t border-[#2b2b2b] pt-8">
            <div className="flex items-center gap-3 px-1">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#353638] text-sm font-semibold text-white">
                {profileName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">{profileName}</p>
                <p className="text-xs text-[#929294]">View profile</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-[88px] items-center justify-between border-b border-[#e4e5e7] px-6">
          <div className="flex items-center gap-3 text-sm text-[#a0a2a6]">
            <span aria-hidden="true" className="text-2xl text-[#a5a7aa]">»</span>
            <span>{currentDate}</span>
          </div>
          <div className="flex h-12 w-[350px] max-w-[52vw] items-center rounded-[14px] bg-white px-6 shadow-[0_14px_30px_rgba(30,35,40,0.06)]">
            <span className="text-base text-[#a7a8ab]">Search here</span>
            <span aria-hidden="true" className="ml-auto text-2xl text-[#4c4e52]">⌕</span>
          </div>
        </header>

        <main className="relative px-5 pb-20 pt-8 sm:px-10">
          {showSuccessToast && (
            <div
              role="status"
              className="fixed right-6 top-6 z-20 flex items-center gap-3 rounded-lg border border-emerald-200 bg-white px-5 py-4 text-sm font-medium text-[#2b2d31] shadow-xl"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2fa79f] text-white">✓</span>
              Transaction created successfully
            </div>
          )}

          <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
            <NavLink to="/transactions" className="font-medium text-[#2fa79f] hover:underline">
              Transactions
            </NavLink>
            <span aria-hidden="true" className="text-[#a3a5a9]">›</span>
            <span className="text-[#77797e]">Add Transaction</span>
          </nav>

          <section className="mx-auto mt-6 max-w-[760px] rounded-2xl bg-white px-6 py-8 shadow-[0_18px_36px_rgba(31,41,55,0.08)] sm:px-10 sm:py-10">
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#202124]">
              Create Transaction
            </h1>
            <p className="mt-2 text-sm text-[#85878b]">Add a revenue or expense to one of your accounts.</p>

            <form onSubmit={handleSubmit} noValidate className="mt-8">
              {accountLoadError && (
                <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {accountLoadError}
                </div>
              )}
              {categoryWarning && (
                <div role="status" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {categoryWarning}
                </div>
              )}

              <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                <Field label="Account" error={errors.accountId} required>
                  <select
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    disabled={isLoadingOptions || accounts.length === 0}
                    className={inputClassName}
                  >
                    <option value="">{isLoadingOptions ? 'Loading accounts...' : 'Select account'}</option>
                    {accounts.map((account) => (
                      <option key={account.account_id} value={account.account_id}>
                        {account.bank_name} •••• {account.account_number_last_4 || 'Account'}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Transaction Date" error={errors.transactionDate} required>
                  <input type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} className={inputClassName} />
                </Field>

                <Field label="Transaction Type" error={errors.type} required>
                  <select value={type} onChange={(event) => setType(event.target.value as TransactionType)} className={inputClassName}>
                    <option value="Expense">Expense</option>
                    <option value="Revenue">Revenue</option>
                  </select>
                </Field>

                <Field label="Status" error={errors.status} required>
                  <select value={status} onChange={(event) => setStatus(event.target.value as TransactionStatus)} className={inputClassName}>
                    <option value="Complete">Complete</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                </Field>

                <Field label="Item Description" error={errors.itemDescription} required>
                  <input maxLength={500} value={itemDescription} onChange={(event) => setItemDescription(event.target.value)} placeholder="e.g. Grocery shopping" className={inputClassName} />
                </Field>

                <Field label="Shop Name" error={errors.shopName} required>
                  <input maxLength={255} value={shopName} onChange={(event) => setShopName(event.target.value)} placeholder="e.g. Green Market" className={inputClassName} />
                </Field>

                <Field label="Amount" error={errors.amount} required>
                  <input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className={inputClassName} />
                </Field>

                <Field label="Payment Method" error={errors.paymentMethod} required>
                  <input maxLength={100} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} placeholder="e.g. Credit Card" className={inputClassName} />
                </Field>

                <Field label="Category (optional)" error={errors.categoryId}>
                  <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={categories.length === 0} className={inputClassName}>
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option key={category.category_id} value={category.category_id}>{category.category_name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {apiError && (
                <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {apiError}
                </div>
              )}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#ececef] pt-6 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => navigate('/transactions')} disabled={isSubmitting} className="h-12 rounded-[5px] border border-[#d6d7da] px-7 text-sm font-semibold text-[#55575b] hover:bg-[#f5f6f7] disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting || isLoadingOptions || accounts.length === 0} className="flex h-12 min-w-[156px] items-center justify-center gap-2 rounded-[5px] bg-[#2fa79f] px-7 text-sm font-semibold text-white hover:bg-[#278f88] disabled:cursor-not-allowed disabled:opacity-50">
                  {isSubmitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

/** Renders a consistently labeled form control and its validation message. */
const Field: React.FC<FieldProps> = ({ label, error, required, children }) => (
  <label className="block text-sm font-semibold text-[#3b3d41]">
    {label}{required && <span className="ml-1 text-red-500">*</span>}
    {children}
    {error && <span className="mt-1.5 block text-xs font-normal text-red-600">{error}</span>}
  </label>
)

export default AddTransactionForm
