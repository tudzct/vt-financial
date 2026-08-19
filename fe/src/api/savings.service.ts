import axiosInstance from './axiosInstance'
import { SavingsSummaryResponse } from './types'

export const savingsService = {
  /** Fetches the idempotent savings summary for one selected year. */
  getSummary: async (year: number): Promise<SavingsSummaryResponse> => {
    const response = await axiosInstance.get<SavingsSummaryResponse>(
      '/v1/savings/summary',
      { params: { year } }
    )

    return response.data
  },
}
