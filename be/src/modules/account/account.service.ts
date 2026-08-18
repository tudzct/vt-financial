import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { AccountListResponseDto } from './dto/account-list.dto';
import { Account, AccountType } from './account.entity';
import { CreateAccountDto } from './dto/create-account.dto';

const DUPLICATE_ACCOUNT_MESSAGE =
  'This account already exists in your account list.';
const CREATE_ACCOUNT_ERROR_MESSAGE =
  'Unable to add the account at this time. Please try again later.';

export interface CreateAccountResponse {
  success: true;
  message: 'Account created successfully';
  data: {
    account: {
      id: number;
      user_id: number;
      bank_name: string;
      account_type: Account['accountType'];
      branch_name: string | null;
      account_number_last_4: string;
      balance: number;
    };
  };
}

/** Provides owned-account lookup business logic. */
@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    private readonly dataSource: DataSource,
  ) {}

  /** Validates, normalizes, and atomically persists one owned account. */
  async create(
    userId: number,
    dto: CreateAccountDto,
  ): Promise<CreateAccountResponse> {
    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      typeof dto?.bank_name !== 'string' ||
      !Object.values(AccountType).includes(dto.account_type) ||
      (dto.branch_name !== undefined &&
        dto.branch_name !== null &&
        typeof dto.branch_name !== 'string') ||
      typeof dto.account_number_full !== 'string' ||
      typeof dto.balance !== 'number' ||
      !Number.isFinite(dto.balance) ||
      dto.balance < 0
    ) {
      throw new BadRequestException('Invalid account data.');
    }

    const bankName = dto.bank_name.normalize('NFC').trim();
    const accountNumberFull = dto.account_number_full.trim();
    const branchName = dto.branch_name?.normalize('NFC').trim() || null;
    const balance = Number(dto.balance.toFixed(2));

    if (
      !bankName ||
      !/^\d{8,34}$/.test(accountNumberFull)
    ) {
      throw new BadRequestException('Invalid account data.');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager
          .getRepository(User)
          .createQueryBuilder('user')
          .setLock('pessimistic_write')
          .where('user.userId = :userId', { userId })
          .getOneOrFail();

        const repository = manager.getRepository(Account);
        const duplicate = await repository.exists({
          where: { userId, accountNumberFull },
        });

        if (duplicate) {
          throw new ConflictException(DUPLICATE_ACCOUNT_MESSAGE);
        }

        const account = repository.create({
          userId,
          bankName,
          accountType: dto.account_type,
          branchName,
          accountNumberFull,
          accountNumberLast4: accountNumberFull.slice(-4),
          balance,
        });
        const savedAccount = await repository.save(account);

        return {
          success: true,
          message: 'Account created successfully',
          data: {
            account: {
              id: savedAccount.accountId,
              user_id: savedAccount.userId,
              bank_name: savedAccount.bankName,
              account_type: savedAccount.accountType,
              branch_name: savedAccount.branchName ?? null,
              account_number_last_4: savedAccount.accountNumberLast4,
              balance: Number(savedAccount.balance),
            },
          },
        };
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(CREATE_ACCOUNT_ERROR_MESSAGE);
    }
  }

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
