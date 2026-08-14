import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountListResponseDto } from './dto/account-list.dto';
import { Account } from './account.entity';

/** Provides owned-account lookup business logic. */
@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  /** Returns only the authenticated user's accounts without full account numbers. */
  async findAllByUserId(userId: number): Promise<AccountListResponseDto> {
    try {
      const accounts = await this.accountRepository.find({
        where: { userId },
        order: { accountId: 'ASC' },
      });

      return {
        success: true,
        message: 'Accounts fetched successfully',
        data: accounts.map((account) => ({
          account_id: account.accountId,
          user_id: account.userId,
          bank_name: account.bankName,
          account_type: account.accountType,
          branch_name: account.branchName ?? null,
          account_number_last_4: account.accountNumberLast4,
          balance: Number(account.balance),
        })),
      };
    } catch {
      throw new InternalServerErrorException('Unable to fetch accounts');
    }
  }
}
