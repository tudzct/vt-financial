/** Public category fields returned by the category lookup. */
export interface CategoryListItemDto {
  category_id: number;
  category_name: string;
}

/** Standard API envelope for the public category lookup. */
export interface CategoryListResponseDto {
  success: true;
  message: string;
  data: CategoryListItemDto[];
}
