import { Category } from './category.entity';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  it('requests alphabetical categories and maps the API shape', async () => {
    const find = jest.fn().mockResolvedValue([
      { categoryId: 7, categoryName: 'Entertainment' } as Category,
    ]);
    const service = new CategoryService({ find } as never);

    const response = await service.findAll();

    expect(find).toHaveBeenCalledWith({ order: { categoryName: 'ASC' } });
    expect(response).toEqual({
      success: true,
      message: 'Categories fetched successfully',
      data: [{ category_id: 7, category_name: 'Entertainment' }],
    });
  });
});
