import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CategoryListResponseDto } from './dto/category-list.dto';

/** Provides public category lookup business logic. */
@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /** Returns all categories ordered by name. */
  async findAll(): Promise<CategoryListResponseDto> {
    try {
      const categories = await this.categoryRepository.find({
        order: { categoryName: 'ASC' },
      });

      return {
        success: true,
        message: 'Categories fetched successfully',
        data: categories.map((category) => ({
          category_id: category.categoryId,
          category_name: category.categoryName,
        })),
      };
    } catch {
      throw new InternalServerErrorException('Unable to fetch categories');
    }
  }
}
