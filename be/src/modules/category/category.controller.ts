import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';

/** Exposes the public category lookup. */
@ApiTags('categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  /** Lists all available transaction categories. */
  @Get()
  @ApiOperation({ summary: 'List categories' })
  findAll() {
    return this.categoryService.findAll();
  }
}
