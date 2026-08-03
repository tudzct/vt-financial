import axios from 'axios'
import { RegisterErrorResponse } from '../features/register/register.types'

export interface NormalizedApiError {
  status?: number
  messages: string[]
}

const FALLBACK_MESSAGE = 'Unable to create your account. Please try again.'
const NETWORK_MESSAGE =
  'Unable to reach the registration service. Check your connection and try again.'
const SERVER_MESSAGE =
  'The registration service is temporarily unavailable. Please try again in a moment.'

const isRegisterErrorResponse = (value: unknown): value is RegisterErrorResponse => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    candidate.success === false &&
    (typeof candidate.message === 'string' || Array.isArray(candidate.message))
  )
}

export const normalizeApiError = (error: unknown): NormalizedApiError => {
  if (!axios.isAxiosError(error)) {
    const message = error instanceof Error ? error.message.trim() : ''
    return { messages: [message || FALLBACK_MESSAGE] }
  }

  const responseData: unknown = error.response?.data
  if (!isRegisterErrorResponse(responseData)) {
    const status = error.response?.status
    if (!error.response) return { messages: [NETWORK_MESSAGE] }
    if (status && status >= 500) return { status, messages: [SERVER_MESSAGE] }
    return { status, messages: [FALLBACK_MESSAGE] }
  }

  const rawMessages = Array.isArray(responseData.message)
    ? responseData.message
    : [responseData.message]
  const messages = rawMessages.filter(
    (message): message is string => typeof message === 'string' && message.trim().length > 0,
  )

  return {
    status: error.response?.status,
    messages: messages.length ? messages.map((message) => message.trim()) : [FALLBACK_MESSAGE],
  }
}
