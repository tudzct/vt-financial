import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { BillDto } from './dto/bill.dto';
import { Bill } from './bill.entity';

/** Retrieves and normalizes upcoming bills owned by an authenticated user. */
@Injectable()
export class BillService {
  constructor(
    @InjectRepository(Bill)
    private readonly billRepository: Repository<Bill>,
  ) {}

  /** Returns every owned bill due today or later in ascending due-date order. */
  async findUpcomingBillsByUserId(userId: number): Promise<BillDto[]> {
    try {
      const currentDate = this.currentDateAtMidnight();
      // BR-BILL-01–03 and BR-BILL-06: owned, upcoming, ordered, read-only query.
      const bills = await this.billRepository.find({
        where: {
          userId,
          dueDate: MoreThanOrEqual(currentDate),
        },
        order: { dueDate: 'ASC' },
      });

      // BR-BILL-04–05: normalize every row and preserve an empty result array.
      return bills.map((bill) => ({
        billId: bill.billId,
        userId: bill.userId,
        itemDescription: bill.itemDescription,
        logoUrl: bill.logoUrl && bill.logoUrl.length > 0 ? bill.logoUrl : null,
        dueDate: this.formatDate(bill.dueDate),
        lastChargeDate: bill.lastChargeDate
          ? this.formatDate(bill.lastChargeDate)
          : null,
        amount: this.normalizeAmount(bill.amount),
      }));
    } catch {
      // BR-BILL-07: conceal repository and mapping details behind the contract error.
      throw new InternalServerErrorException('Failed to fetch bills');
    }
  }

  /** Creates today's local system date at exactly midnight. */
  private currentDateAtMidnight(): Date {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    return currentDate;
  }

  /** Formats a database date without shifting its calendar day across time zones. */
  private formatDate(value: Date | string): string {
    if (typeof value === 'string') {
      const dateOnly = value.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error('Invalid bill date');

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Converts the persisted DECIMAL value to a finite JavaScript number. */
  private normalizeAmount(value: number | string): number {
    const amount = Number(value);
    if (!Number.isFinite(amount)) throw new Error('Invalid bill amount');
    return amount;
  }
}
