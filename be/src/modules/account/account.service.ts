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
        select: {
          accountId: true,
          bankName: true,
          accountType: true,
          branchName: true,
          accountNumberLast4: true,
          balance: true,
        },
        where: { userId },
        order: { accountId: 'ASC' },
      });

      return {
        success: true,
        message: 'Lấy danh sách tài khoản thành công',
        data: {
          user_id: userId,
          accounts: accounts.map((account) => ({
            id: account.accountId,
            bank_name: account.bankName,
            account_type: account.accountType,
            branch_name: account.branchName ?? null,
            account_number_last_4: account.accountNumberLast4,
            balance: Number(account.balance),
          })),
        },
      };
    } catch {
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.',
      );
    }
  }
}
