import axios from 'axios'
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountService } from '../../api/account.service'
import checkIcon from '../../assets/delete-account/check.svg'

const INVALID_ACCOUNT_ID_MESSAGE = 'Invalid account ID.'
const DELETE_ERROR_MESSAGE =
  'A system error occurred. The account and related transactions could not be deleted.'

export interface DeleteAccountTarget {
  id: number
  bankName: string
  accountNumberLast4: string
}

interface DeleteAccountModalProps {
  account: DeleteAccountTarget | null
  isOpen: boolean
  onClose: () => void
  onDeleted: (accountId: number) => void
  onAutoComplete: () => void | Promise<void>
}

/** Renders and controls the UC-09 confirmation and success dialogs. */
const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  account,
  isOpen,
  onClose,
  onDeleted,
  onAutoComplete,
}) => {
  const navigate = useNavigate()
  const submissionInFlight = useRef(false)
  const [selectedAccount, setSelectedAccount] =
    useState<DeleteAccountTarget | null>(account)
  const [isModalVisible, setIsModalVisible] = useState(isOpen)
  const [isDeleting, setIsDeleting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    setSelectedAccount(account)
    setIsModalVisible(true)
    setIsDeleting(false)
    setApiError('')
    setIsSuccess(false)
    submissionInFlight.current = false
  }, [account, isOpen])

  useEffect(() => {
    if (!isSuccess) return

    const timer = window.setTimeout(() => {
      void Promise.resolve(onAutoComplete()).finally(onClose)
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [isSuccess, onAutoComplete, onClose])

  /** Cancels the confirmation without mutating account data. */
  const handleCancel = () => {
    if (isDeleting) return
    setIsModalVisible(false)
    onClose()
  }

  /** Validates the target and submits one idempotent delete request. */
  const handleConfirmDelete = async () => {
    if (submissionInFlight.current || isDeleting) return

    if (
      !selectedAccount ||
      !Number.isSafeInteger(selectedAccount.id) ||
      selectedAccount.id <= 0
    ) {
      setApiError(INVALID_ACCOUNT_ID_MESSAGE)
      return
    }

    submissionInFlight.current = true
    setIsDeleting(true)
    setApiError('')

    try {
      const response = await accountService.deleteAccount(selectedAccount.id)

      if (
        response.message !== 'Account deleted successfully' ||
        response.deleted_account_id !== selectedAccount.id
      ) {
        throw new Error(DELETE_ERROR_MESSAGE)
      }

      onDeleted(response.deleted_account_id)
      setIsModalVisible(false)
      setIsSuccess(true)
    } catch (requestError: unknown) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        return
      }

      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || DELETE_ERROR_MESSAGE
        : requestError instanceof Error
          ? requestError.message
          : DELETE_ERROR_MESSAGE

      setApiError(Array.isArray(message) ? message.join(', ') : String(message))
    } finally {
      submissionInFlight.current = false
      setIsDeleting(false)
    }
  }

  /** Returns immediately to the balances list. */
  const handleBackToBalances = () => {
    onClose()
    navigate('/accounts')
  }

  if (!isOpen && !isSuccess) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 top-[88px] z-40 flex items-center justify-center bg-[#f4f5f7] px-4 py-8 lg:left-[280px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && isModalVisible) handleCancel()
      }}
    >
      {isSuccess ? (
        <section
          className="flex w-full max-w-[560px] flex-col items-center gap-8 rounded-[16px] bg-white p-6 shadow-[0_20px_25px_rgba(76,103,100,0.1)] sm:p-12"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-success-title"
        >
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[rgba(41,157,145,0.08)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#299d91]">
              <img src={checkIcon} alt="" className="h-7 w-7" />
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-3 text-center">
            <h2
              id="delete-account-success-title"
              className="text-[20px] font-semibold capitalize leading-7 text-[#191919]"
            >
              Account Removed Successfully!
            </h2>
            <p className="text-[16px] leading-6 text-[#666]">
              Your account has been removed successfully.
            </p>
          </div>

          <button
            type="button"
            onClick={handleBackToBalances}
            className="h-12 w-full rounded-[4px] bg-[#299d91] px-8 py-3 text-[16px] font-semibold leading-6 text-white hover:bg-[#278f87] focus:outline-none focus:ring-2 focus:ring-[#299d91] focus:ring-offset-2"
          >
            Back to Balances
          </button>
        </section>
      ) : isModalVisible && selectedAccount ? (
        <section
          className="flex w-full max-w-[560px] flex-col items-center justify-center gap-8 rounded-[16px] bg-white p-6 shadow-[0_20px_25px_rgba(76,103,100,0.1)] sm:p-12"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[rgba(242,51,51,0.1)]">
            <span className="text-center text-[32px] font-normal leading-none text-[#e53333]" aria-hidden="true">
              ⚠
            </span>
          </div>

          <h2
            id="delete-account-title"
            className="w-full text-center text-[22px] font-bold leading-normal text-[#191919]"
          >
            Confirm Account Deletion
          </h2>

          <p
            className={`w-full text-center text-[14px] leading-[22px] ${
              apiError ? 'text-[#d92e2e]' : 'text-[#595959]'
            }`}
            role={apiError ? 'alert' : undefined}
          >
            {apiError ||
              `WARNING: Are you sure you want to delete the ${selectedAccount.bankName} - ${selectedAccount.accountNumberLast4} account? This action will PERMANENTLY delete the account and ALL related transactions.`}
          </p>

          <div className="flex w-full flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isDeleting}
              className="flex-1 rounded-[4px] border border-[#ccd1d6] bg-[#ebedf0] px-8 py-3 text-[14px] font-semibold text-[#333] hover:bg-[#e1e4e8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmDelete()}
              disabled={isDeleting}
              className="flex-1 rounded-[4px] bg-[#d92e2e] px-8 py-3 text-[14px] font-semibold text-white hover:bg-[#c52626] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default DeleteAccountModal
