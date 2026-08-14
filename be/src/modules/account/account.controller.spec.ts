import { AccountController } from './account.controller';

describe('AccountController', () => {
  it('forwards the authenticated user ID to the service', async () => {
    const findAllByUserId = jest.fn().mockResolvedValue({ data: [] });
    const controller = new AccountController({ findAllByUserId } as never);

    await controller.findAll({ user: { userId: 42 } } as never);

    expect(findAllByUserId).toHaveBeenCalledWith(42);
  });
});
