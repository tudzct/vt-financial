import axios from 'axios'
import React, { FormEvent, useRef, useState } from 'react'
import { accountService } from '../../api/account.service'
import {
  AccountDetail,
  AccountType,
  UpdatedAccount,
  UpdateAccountPayload,
} from '../../api/types'
import checkIcon from '../../assets/add-account/check.svg'
import closeIcon from '../../assets/add-account/close.svg'

const ACCOUNT_TYPES: AccountType[] = [
  'Checking',
  'Credit Card',
  'Savings',
  'Investment',
  'Loan',
]

interface AccountEditFormProps {
  account: AccountDetail
  onCancel: () => void
  onSuccess: (account: UpdatedAccount) => void | Promise<void>
}

interface FormValues {
  accountType: AccountType | ''
  bankName: string
  branchName: string
  accountNumberFull: string
  balance: string
}

type FieldName = keyof FormValues
type FieldErrors = Partial<Record<FieldName, string>>

const FALLBACK_ERROR = 'An error occurred while saving the data. Please try again later.'
const STATUS_ERROR_MESSAGES: Partial<Record<number, string>> = {
  403: 'You do not have permission to edit this account information.',
  404: 'This account could not be found.',
  500: FALLBACK_ERROR,
}

/** Maps backend validation details to the corresponding editable field. */
const mapApiFieldErrors = (messages: string[]): FieldErrors => {
  const errors: FieldErrors = {}

  messages.forEach((message) => {
    const normalized = message.toLowerCase()
    if (normalized.includes('account type')) errors.accountType = message
    else if (normalized.includes('bank name')) errors.bankName = message
    else if (normalized.includes('branch name')) errors.branchName = message
    else if (normalized.includes('account number')) errors.accountNumberFull = message
    else if (normalized.includes('balance')) errors.balance = message
  })

  return errors
}

/** Renders and submits the Figma 106.1 account-edit form. */
const AccountEditForm: React.FC<AccountEditFormProps> = ({
  account,
  onCancel,
  onSuccess,
}) => {
  const [form, setForm] = useState<FormValues>({
    accountType: account.account_type,
    bankName: account.bank_name,
    branchName: account.branch_name ?? '',
    accountNumberFull: account.account_number_full,
    balance: String(account.balance),
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const submissionInFlight = useRef(false)

  /** Updates one controlled field and clears its stale validation error. */
  const updateField = (field: FieldName, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setApiError('')
  }

  /** Applies BR-ACC-20 through BR-ACC-24 before network submission. */
  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}
    const accountNumber = form.accountNumberFull.trim()
    const balance = Number(form.balance)

    if (!form.accountType || !ACCOUNT_TYPES.includes(form.accountType)) {
      errors.accountType = 'Please select a valid account type.'
    }
    if (!form.bankName.trim()) errors.bankName = 'This field is required'
    if (!accountNumber) errors.accountNumberFull = 'This field is required'
    else if (!/^\d+$/.test(accountNumber)) {
      errors.accountNumberFull = 'The account number must contain only numeric digits.'
    } else if (accountNumber.length < 8 || accountNumber.length > 34) {
      errors.accountNumberFull = 'The account number must be between 8 and 34 digits.'
    }
    if (!form.balance.trim()) errors.balance = 'This field is required'
    else if (!Number.isFinite(balance)) errors.balance = 'The balance must be a valid number.'
    else if (balance < 0) errors.balance = 'The balance must be greater than or equal to 0.'

    return errors
  }

  /** Submits one idempotent full account update and handles the success transition. */
  const handleUpdateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submissionInFlight.current) return

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setApiError('Please correct the highlighted fields.')
      return
    }

    const payload: UpdateAccountPayload = {
      bank_name: form.bankName.trim(),
      account_type: form.accountType as AccountType,
      branch_name: form.branchName.trim() || null,
      account_number_full: form.accountNumberFull.trim(),
      balance: Number(form.balance),
    }

    submissionInFlight.current = true
    setIsSubmitting(true)
    setFieldErrors({})
    setApiError('')

    try {
      const response = await accountService.updateAccount(account.id, payload)
      setSuccessMessage(response.message)
      setShowSuccessToast(true)
      await new Promise((resolve) => window.setTimeout(resolve, 1500))
      await onSuccess(response.account)
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      const responseMessage = axios.isAxiosError(error)
        ? error.response?.data?.message
        : undefined
      const messages = Array.isArray(responseMessage)
        ? responseMessage.map(String)
        : [
            (status && STATUS_ERROR_MESSAGES[status]) ||
              (typeof responseMessage === 'string'
                ? responseMessage
                : FALLBACK_ERROR),
          ]

      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const mappedErrors = mapApiFieldErrors(messages)
        setFieldErrors(mappedErrors)
        setApiError(messages.join(' '))
      } else {
        setApiError(messages.join(' '))
      }
    } finally {
      submissionInFlight.current = false
      setIsSubmitting(false)
    }
  }

  const inputClass = (field: FieldName): string =>
    `mt-2 h-12 w-full rounded-[8px] border bg-white px-4 text-[16px] leading-6 text-[#191919] outline-none transition focus:border-[#299d91] ${
      fieldErrors[field] ? 'border-[#d92d20]' : 'border-[#d0d5dd]'
    }`

  /** Displays one inline error using the Figma validation styling. */
  const renderError = (field: FieldName) =>
    fieldErrors[field] ? (
      <p className="mt-2 text-[12px] leading-4 text-[#d92d20]">{fieldErrors[field]}</p>
    ) : null

  return (
    <>
      {showSuccessToast && (
        <div className="fixed right-6 top-[106px] z-50 flex items-center gap-3 rounded-[8px] border-l-4 border-[#299d91] bg-white px-4 py-[14px] text-[14px] font-medium text-[#191d23] shadow-[0_20px_25px_rgba(76,103,100,0.18)] sm:right-10" role="status">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#299d91] p-1" aria-hidden="true">
            <img src={checkIcon} alt="" className="h-[10px] w-[10px]" />
          </span>
          {successMessage}
          <button type="button" onClick={() => setShowSuccessToast(false)} className="flex h-[18px] w-[18px] items-center justify-center p-1" aria-label="Dismiss notification">
            <img src={closeIcon} alt="" className="h-[10px] w-[10px]" />
          </button>
        </div>
      )}

      <form onSubmit={handleUpdateAccount} className="w-full max-w-[560px] rounded-[12px] bg-white p-6 shadow-[0_20px_25px_rgba(76,103,100,0.1)] sm:p-10" noValidate>
        <h2 className="text-[20px] font-semibold capitalize leading-7">Edit details</h2>

        {apiError && (
          <div className="mt-5 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-[#d92d20]" role="alert">
            {apiError}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-5">
          <label className="block text-[14px] font-medium leading-5 text-[#191d23]">
            Account Type
            <select value={form.accountType} onChange={(event) => updateField('accountType', event.target.value)} className={inputClass('accountType')}>
              {ACCOUNT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            {renderError('accountType')}
          </label>

          <label className="block text-[14px] font-medium leading-5 text-[#191d23]">
            Bank Name
            <input value={form.bankName} onChange={(event) => updateField('bankName', event.target.value)} placeholder="Enter bank name" className={inputClass('bankName')} />
            {renderError('bankName')}
          </label>

          <label className="block text-[14px] font-medium leading-5 text-[#191d23]">
            Branch Name (Optional)
            <input value={form.branchName} onChange={(event) => updateField('branchName', event.target.value)} placeholder="Enter branch name" className={inputClass('branchName')} />
            {renderError('branchName')}
          </label>

          <label className="block text-[14px] font-medium leading-5 text-[#191d23]">
            Account Number
            <input inputMode="numeric" value={form.accountNumberFull} onChange={(event) => updateField('accountNumberFull', event.target.value)} placeholder="Enter account number" className={inputClass('accountNumberFull')} />
            {renderError('accountNumberFull')}
          </label>

          <label className="block text-[14px] font-medium leading-5 text-[#191d23]">
            Initial Balance
            <input type="number" min="0" step="0.01" inputMode="decimal" value={form.balance} onChange={(event) => updateField('balance', event.target.value)} placeholder="$0.00" className={inputClass('balance')} />
            {renderError('balance')}
          </label>
        </div>

        <div className="mt-6 flex items-center gap-6">
          <button type="submit" disabled={isSubmitting} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[4px] bg-[#299d91] px-8 text-[16px] font-semibold text-white hover:bg-[#278f87] disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
            {isSubmitting ? 'Saving....' : 'Save changes'}
          </button>
          <button type="button" onClick={onCancel} disabled={isSubmitting} className="p-2 text-[16px] font-semibold text-[#666] disabled:opacity-60">Cancel</button>
        </div>
      </form>
    </>
  )
}

export default AccountEditForm
