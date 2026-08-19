/** Represents one calendar month's rounded net savings. */
export class MonthlySavingsDto {
  month: string;
  amount: number;
}

/** Contains the selected-year and preceding-year monthly series. */
export class SavingsSummaryDto {
  this_year: MonthlySavingsDto[];
  last_year: MonthlySavingsDto[];
}

/** Successful response for API-SAVINGS-SUMMARY. */
export class SavingsSummaryResponseDto {
  user_id: number;
  year: number;
  summary: SavingsSummaryDto;
}
