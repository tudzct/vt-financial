/** Normalized bill fields returned by the upcoming-bills endpoint. */
export class BillDto {
  billId: number;
  userId: number;
  itemDescription: string;
  logoUrl: string | null;
  dueDate: string;
  lastChargeDate: string | null;
  amount: number;
}
