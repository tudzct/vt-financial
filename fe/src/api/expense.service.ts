import axiosInstance from './axiosInstance'

export interface ExpenseSubCategory {
  item_description: string
  amount: number
  date: string
}

export interface BreakdownResult {
  category: string
  total: number
  changePercent: number | null
  subCategories: ExpenseSubCategory[]
}

interface ExpenseBreakdownResponse {
  data: BreakdownResult[]
}

/** Requests an authenticated expense breakdown for one calendar month. */
export const getExpensesBreakdown = (month: string, signal?: AbortSignal) =>
  axiosInstance.get<ExpenseBreakdownResponse>('/v1/expenses/breakdown', {
    params: { month },
    signal,
  })
