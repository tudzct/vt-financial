import { getMetadataArgsStorage } from 'typeorm';
import { User } from './user.entity';

describe('User entity', () => {
  it('maps only columns that exist in the documented Users table', () => {
    const columnNames = getMetadataArgsStorage()
      .filterColumns(User)
      .map((column) => column.options.name ?? column.propertyName);

    expect(columnNames).toEqual([
      'user_id',
      'full_name',
      'email',
      'username',
      'password',
      'phone_number',
      'profile_picture_url',
      'total_balance',
    ]);
  });
});
