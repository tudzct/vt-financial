import { AccountType, Account } from './account.entity';
import { AccountService } from './account.service';

describe('AccountService', () => {
  it('returns owned accounts in API shape without the full account number', async () => {
    const find = jest.fn().mockResolvedValue([
      {
        accountId: 3,
        userId: 42,
        bankName: 'Vietcombank',
        accountType: AccountType.CHECKING,
        branchName: 'District 1',
        accountNumberFull: 'secret-number',
        accountNumberLast4: '0123',
        balance: '4500.50',
      } as unknown as Account,
    ]);
    const service = new AccountService({ find } as never);

    const response = await service.findAllByUserId(42);

    expect(find).toHaveBeenCalledWith({
      where: { userId: 42 },
      order: { accountId: 'ASC' },
    });
    expect(response.data[0]).toEqual({
      account_id: 3,
      user_id: 42,
      bank_name: 'Vietcombank',
      account_type: AccountType.CHECKING,
      branch_name: 'District 1',
      account_number_last_4: '0123',
      balance: 4500.5,
    });
    expect(response.data[0]).not.toHaveProperty('account_number_full');
  });
});
