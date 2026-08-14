import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Account } from '../account/account.entity';
import { TransactionService } from './transaction.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './transaction.entity';

describe('TransactionService.create UC-04', () => {
  const accountRepository = {} as Repository<Account>;
  const transactionRepository = {} as Repository<Transaction>;
  const dataSource = { transaction: jest.fn() } as unknown as DataSource;
  const service = new TransactionService(
    accountRepository,
    transactionRepository,
    dataSource,
  );

  const dto = {
    accountId: 3,
    transactionDate: '2025-11-01',
    type: TransactionType.EXPENSE,
    itemDescription: '  Movie Ticket  ',
    shopName: '  Cinema  ',
    amount: 150000,
    paymentMethod: '  Credit Card  ',
  };

  /** Creates a transaction-manager double with a locked owned account. */
  const createManager = (overrides?: {
    account?: Account | null;
    categoryExists?: boolean;
    saveError?: Error;
  }) => {
    const account = overrides?.account === undefined
      ? ({ accountId: 3, userId: 42, balance: 500000 } as Account)
      : overrides.account;
    const queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(account),
    };
    const savedTransaction = {
      transactionId: 8,
      accountId: 3,
      transactionDate: new Date('2025-11-01T00:00:00.000Z'),
      type: TransactionType.EXPENSE,
      itemDescription: 'Movie Ticket',
      shopName: 'Cinema',
      amount: 150000,
      paymentMethod: 'Credit Card',
      status: TransactionStatus.COMPLETE,
      receiptId: null,
      categoryId: null,
    } as Transaction;
    const managedAccountRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      save: jest.fn().mockResolvedValue(account),
    };
    const managedTransactionRepository = {
      create: jest.fn((value) => value),
      save: overrides?.saveError
        ? jest.fn().mockRejectedValue(overrides.saveError)
        : jest.fn().mockResolvedValue(savedTransaction),
    };
    const managedCategoryRepository = {
      exists: jest.fn().mockResolvedValue(overrides?.categoryExists ?? true),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Account) return managedAccountRepository;
        if (entity === Transaction) return managedTransactionRepository;
        return managedCategoryRepository;
      }),
    };

    return {
      manager,
      queryBuilder,
      managedAccountRepository,
      managedTransactionRepository,
    };
  };

  beforeEach(() => jest.clearAllMocks());

  it('locks the owned account, creates one Expense, and decreases balance atomically', async () => {
    const fixture = createManager();
    jest.spyOn(dataSource, 'transaction').mockImplementation(async (work) =>
      work(fixture.manager as never),
    );

    const result = await service.create(42, dto);

    expect(fixture.queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(fixture.managedTransactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 3,
        itemDescription: 'Movie Ticket',
        shopName: 'Cinema',
        paymentMethod: 'Credit Card',
        amount: 150000,
        status: TransactionStatus.COMPLETE,
        categoryId: null,
      }),
    );
    expect(fixture.managedAccountRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ balance: 350000 }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        message: 'Transaction created successfully',
        data: expect.objectContaining({
          transactionId: 8,
          transactionDate: '2025-11-01T00:00:00.000Z',
          category_id: null,
        }),
      }),
    );
  });

  it('rejects a non-owned account with HTTP 400 semantics', async () => {
    const fixture = createManager({ account: null });
    jest.spyOn(dataSource, 'transaction').mockImplementation(async (work) =>
      work(fixture.manager as never),
    );

    await expect(service.create(42, dto)).rejects.toMatchObject({
      status: 400,
      message: 'Invalid or missing transaction data',
    });
  });

  it('rejects an Expense that exceeds the locked account balance', async () => {
    const fixture = createManager({
      account: { accountId: 3, userId: 42, balance: 100 } as Account,
    });
    jest.spyOn(dataSource, 'transaction').mockImplementation(async (work) =>
      work(fixture.manager as never),
    );

    await expect(service.create(42, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fixture.managedTransactionRepository.save).not.toHaveBeenCalled();
    expect(fixture.managedAccountRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a supplied category that does not exist', async () => {
    const fixture = createManager({ categoryExists: false });
    jest.spyOn(dataSource, 'transaction').mockImplementation(async (work) =>
      work(fixture.manager as never),
    );

    await expect(
      service.create(42, { ...dto, category_id: 999 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns the specified HTTP 500 error when persistence fails', async () => {
    const fixture = createManager({ saveError: new Error('database unavailable') });
    jest.spyOn(dataSource, 'transaction').mockImplementation(async (work) =>
      work(fixture.manager as never),
    );

    await expect(service.create(42, dto)).rejects.toEqual(
      new InternalServerErrorException(
        'Đã xảy ra lỗi hệ thống khi tạo giao dịch. Vui lòng thử lại sau.',
      ),
    );
    expect(fixture.managedAccountRepository.save).not.toHaveBeenCalled();
  });
});
