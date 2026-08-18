import axios from 'axios'
import React, { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountService } from '../../api/account.service'
import {
  AccountType,
  CreatedAccount,
  CreateAccountPayload,
} from '../../api/types'
import checkIcon from '../../assets/add-account/check.svg'
import chevronUpIcon from '../../assets/add-account/chevron-up.svg'
import closeIcon from '../../assets/add-account/close.svg'

const ACCOUNT_TYPES: AccountType[] = [
  'Credit Card',
  'Checking',
  'Savings',
  'Investment',
  'Loan',
]

interface FormValues {
  accountType: AccountType
  bankName: string
  branchName: string
  accountNumber: string
  balance: string
}

type FieldName = keyof FormValues
type FieldErrors = Partial<Record<FieldName, string>>

const INITIAL_VALUES: FormValues = {
  accountType: 'Checking',
  bankName: '',
  branchName: '',
  accountNumber: '',
  balance: '',
}

const SYSTEM_ERROR_MESSAGE =
  'Unable to add the account at this time. Please try again later.'

/** Extracts the standard API error envelope without exposing request data. */
const getApiMessages = (error: unknown): string[] => {
  if (!axios.isAxiosError(error)) return [SYSTEM_ERROR_MESSAGE]

  const message = error.response?.data?.message
  if (Array.isArray(message)) return message.map(String)
  if (typeof message === 'string' && message.trim()) return [message]

  if (error.response?.status === 401) return ['Unauthorized']
  if (error.response?.status === 409) {
    return ['This account already exists in your account list.']
  }
  return [SYSTEM_ERROR_MESSAGE]
}

/** Implements the validated UC-06 account creation flow. */
const AddAccountForm: React.FC = () => {
  const navigate = useNavigate()
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [isTypeOpen, setIsTypeOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(
    null
  )
  const [isToastVisible, setIsToastVisible] = useState(false)
  const submittingRef = useRef(false)
  const navigationTimerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current)
      }
    },
    []
  )

  /** Updates one controlled field and clears its stale error. */
  const updateField = (field: FieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  /** Enforces client-applicable BR-ACC-07 through BR-ACC-14 rules. */
  const validate = (): FieldErrors => {
    const nextErrors: FieldErrors = {}
    const balance = Number(values.balance)

    if (!ACCOUNT_TYPES.includes(values.accountType)) {
      nextErrors.accountType = 'This field is required'
    }
    if (!values.bankName.trim()) {
      nextErrors.bankName = 'This field is required'
    }
    if (!values.accountNumber.trim()) {
      nextErrors.accountNumber = 'This field is required'
    } else if (!/^\d+$/.test(values.accountNumber.trim())) {
      nextErrors.accountNumber = 'Account number must contain digits only.'
    } else if (!/^\d{8,34}$/.test(values.accountNumber.trim())) {
      nextErrors.accountNumber = 'Account number must contain 8 to 34 digits.'
    }
    if (!values.balance.trim()) {
      nextErrors.balance = 'This field is required'
    } else if (!Number.isFinite(balance)) {
      nextErrors.balance = 'Initial balance must be a number.'
    } else if (balance < 0) {
      nextErrors.balance =
        'Initial balance must be greater than or equal to 0.'
    }

    return nextErrors
  }

  /** Maps authoritative backend failures to a field when possible. */
  const applyApiError = (error: unknown) => {
    const messages = getApiMessages(error)
    const nextErrors: FieldErrors = {}
    const unmapped: string[] = []

    messages.forEach((message) => {
      const normalized = message.toLowerCase()
      if (normalized.includes('account type')) nextErrors.accountType = message
      else if (normalized.includes('bank name')) nextErrors.bankName = message
      else if (normalized.includes('branch name')) nextErrors.branchName = message
      else if (
        normalized.includes('account number') ||
        normalized.includes('already exists')
      ) {
        nextErrors.accountNumber = message
      } else if (normalized.includes('balance')) nextErrors.balance = message
      else unmapped.push(message)
    })

    setErrors(nextErrors)
    setFormError(unmapped.join(' '))
  }

  /** Sends one normalized request and prevents duplicate submissions. */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current || createdAccount) return

    const validationErrors = validate()
    setErrors(validationErrors)
    setFormError('')
    if (Object.keys(validationErrors).length > 0) return

    submittingRef.current = true
    setIsSubmitting(true)

    const payload: CreateAccountPayload = {
      bank_name: values.bankName.normalize('NFC').trim(),
      account_type: values.accountType,
      account_number_full: values.accountNumber.trim(),
      balance: Math.round((Number(values.balance) + Number.EPSILON) * 100) / 100,
      ...(values.branchName.trim()
        ? { branch_name: values.branchName.normalize('NFC').trim() }
        : {}),
    }

    try {
      const response = await accountService.createAccount(payload)
      setCreatedAccount(response.data.account)
      setIsToastVisible(true)
      setErrors({})
      setFormError('')
      navigationTimerRef.current = window.setTimeout(
        () => navigate('/accounts'),
        1500
      )
    } catch (error: unknown) {
      applyApiError(error)
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  /** Returns the Figma normal or validation border state for a field. */
  const fieldClass = (field: FieldName) =>
    `h-12 w-full rounded-lg border bg-white px-4 text-[16px] leading-6 text-[#191919] outline-none transition placeholder:text-[#999da3] focus:border-[#299d91] ${
      errors[field] ? 'border-[#d92d20]' : 'border-[#d0d5dd]'
    }`

  /** Renders the Figma 12px field-level error state. */
  const renderError = (field: FieldName) =>
    errors[field] ? (
      <p className="text-xs leading-4 text-[#d92d20]">{errors[field]}</p>
    ) : null

  const displayedAccountNumber = createdAccount
    ? `**** ${createdAccount.account_number_last_4}`
    : values.accountNumber
  const displayedBalance = createdAccount
    ? `$${createdAccount.balance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : values.balance

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-[560px] rounded-xl bg-white p-6 shadow-[0_20px_25px_rgba(76,103,100,0.1)] sm:p-10"
      >
        <h2 className="text-[20px] font-semibold capitalize leading-7 text-[#191919]">
          Create New Account
        </h2>

        <div className="mt-6 flex flex-col gap-5">
          <label className="relative flex flex-col gap-2 text-[14px] font-medium leading-5 text-[#191d23]">
            Account Type
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isTypeOpen}
              disabled={Boolean(createdAccount)}
              onClick={() => setIsTypeOpen((current) => !current)}
              className={`flex h-12 w-full items-center justify-between rounded-lg border bg-white px-4 text-left text-[16px] font-normal leading-6 ${
                errors.accountType ? 'border-[#d92d20]' : 'border-[#299d91]'
              }`}
            >
              <span>{values.accountType || 'Select account type'}</span>
              <img
                src={chevronUpIcon}
                alt=""
                className={`h-4 w-4 transition-transform ${
                  isTypeOpen || createdAccount ? '' : 'rotate-180'
                }`}
              />
            </button>
            {isTypeOpen && !createdAccount && (
              <div
                role="listbox"
                aria-label="Account Type"
                className="absolute left-0 right-0 top-[76px] z-20 flex flex-col gap-1 rounded-lg border border-[#e4e7eb] bg-white p-2 shadow-[0_20px_25px_rgba(76,103,100,0.1)]"
              >
                {ACCOUNT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="option"
                    aria-selected={values.accountType === type}
                    onClick={() => {
                      updateField('accountType', type)
                      setIsTypeOpen(false)
                    }}
                    className={`rounded-md px-3 py-2.5 text-left text-[14px] font-normal leading-5 ${
                      values.accountType === type
                        ? 'bg-[#299d91] text-[16px] font-semibold leading-6 text-white'
                        : 'text-[#191d23] hover:bg-[#f4f5f7]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
            {renderError('accountType')}
          </label>

          <label className="flex flex-col gap-2 text-[14px] font-medium leading-5 text-[#191d23]">
            Bank Name
            <input
              type="text"
              value={createdAccount?.bank_name ?? values.bankName}
              onChange={(event) => updateField('bankName', event.target.value)}
              readOnly={Boolean(createdAccount)}
              placeholder="Enter bank name"
              className={fieldClass('bankName')}
            />
            {renderError('bankName')}
          </label>

          <label className="flex flex-col gap-2 text-[14px] font-medium leading-5 text-[#191d23]">
            Branch Name (Optional)
            <input
              type="text"
              value={createdAccount?.branch_name ?? values.branchName}
              onChange={(event) => updateField('branchName', event.target.value)}
              readOnly={Boolean(createdAccount)}
              placeholder="Enter branch name"
              className={fieldClass('branchName')}
            />
            {renderError('branchName')}
          </label>

          <label className="flex flex-col gap-2 text-[14px] font-medium leading-5 text-[#191d23]">
            Account Number
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={displayedAccountNumber}
              onChange={(event) => updateField('accountNumber', event.target.value)}
              readOnly={Boolean(createdAccount)}
              placeholder="Enter account number"
              className={fieldClass('accountNumber')}
            />
            {renderError('accountNumber')}
          </label>

          <label className="flex flex-col gap-2 text-[14px] font-medium leading-5 text-[#191d23]">
            Initial Balance
            <input
              type="text"
              inputMode="decimal"
              value={displayedBalance}
              onChange={(event) => updateField('balance', event.target.value)}
              readOnly={Boolean(createdAccount)}
              placeholder="$0.00"
              className={fieldClass('balance')}
            />
            {renderError('balance')}
          </label>
        </div>

        {formError && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-[#d92d20]/30 bg-red-50 px-4 py-3 text-[14px] text-[#d92d20]"
          >
            {formError}
          </div>
        )}

        <div className="mt-6 flex items-center gap-6">
          <button
            type="submit"
            disabled={isSubmitting || Boolean(createdAccount)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded bg-[#299d91] px-8 text-[16px] font-semibold leading-6 text-white hover:bg-[#278f87] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
            )}
            {isSubmitting ? 'Adding account...' : 'Add Account'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/accounts')}
            disabled={isSubmitting}
            className="p-2 text-[16px] font-semibold leading-6 text-[#666] disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>

      {createdAccount && isToastVisible && (
        <div
          role="status"
          className="fixed right-5 top-24 z-50 flex items-center gap-3 rounded-lg border-l-4 border-[#299d91] bg-white px-4 py-3.5 shadow-[0_20px_25px_rgba(76,103,100,0.1)] sm:right-10 sm:top-28"
        >
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#299d91] p-1">
            <img src={checkIcon} alt="" className="h-2.5 w-2.5" />
          </span>
          <p className="text-[14px] font-medium capitalize leading-5 text-[#191d23]">
            Account added successfully!
          </p>
          <button
            type="button"
            onClick={() => setIsToastVisible(false)}
            aria-label="Close notification"
            className="flex h-[18px] w-[18px] items-center justify-center p-1"
          >
            <img src={closeIcon} alt="" className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </>
  )
}

export default AddAccountForm
