import { BadRequestException } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { TransactionStatus, TransactionType } from './transaction.entity';

describe('TransactionController UC-04', () => {
  const transactionService = {
    create: jest.fn(),
  } as unknown as TransactionService;
  const controller = new TransactionController(transactionService);

  beforeEach(() => jest.clearAllMocks());

  it('passes request.user.userId and the DTO to TransactionService.create', async () => {
    const dto = {
      accountId: 3,
      transactionDate: '2025-11-01',
      type: TransactionType.EXPENSE,
      itemDescription: 'Movie Ticket',
      shopName: 'Cinema',
      amount: 150000,
      paymentMethod: 'Credit Card',
      status: TransactionStatus.COMPLETE,
    };
    const expected = { message: 'Transaction created successfully', data: {} };
    jest.spyOn(transactionService, 'create').mockResolvedValue(expected as never);

    await expect(
      controller.create({ user: { userId: 42 } } as never, dto),
    ).resolves.toBe(expected);
    expect(transactionService.create).toHaveBeenCalledWith(42, dto);
  });

  it('does not translate service BadRequestException into another status', async () => {
    jest
      .spyOn(transactionService, 'create')
      .mockRejectedValue(new BadRequestException('Invalid or missing transaction data'));

    await expect(
      controller.create(
        { user: { userId: 42 } } as never,
        {
          accountId: 3,
          transactionDate: '2025-11-01',
          type: TransactionType.EXPENSE,
          itemDescription: 'Movie Ticket',
          shopName: 'Cinema',
          amount: 150000,
          paymentMethod: 'Credit Card',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
