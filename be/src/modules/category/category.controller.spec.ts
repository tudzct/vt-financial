import { CategoryController } from './category.controller';

describe('CategoryController', () => {
  it('delegates the public category lookup to the service', async () => {
    const findAll = jest.fn().mockResolvedValue({ data: [] });
    const controller = new CategoryController({ findAll } as never);

    await controller.findAll();

    expect(findAll).toHaveBeenCalledTimes(1);
  });
});
