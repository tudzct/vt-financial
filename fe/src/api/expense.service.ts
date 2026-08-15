import axiosInstance from './axiosInstance'
import { ApiResponse, ExpenseSummaryItem } from './types'

/** Retrieves the authenticated user's current-year monthly expense summary. */
export const expenseService = {
  getExpenseSummary: async (
    signal?: AbortSignal,
  ): Promise<ApiResponse<ExpenseSummaryItem[]>> => {
    const response = await axiosInstance.get('/v1/expenses/summary', { signal })
    return response.data
  },
}
