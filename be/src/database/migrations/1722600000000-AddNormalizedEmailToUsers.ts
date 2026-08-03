import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNormalizedEmailToUsers1722600000000
  implements MigrationInterface
{
  name = 'AddNormalizedEmailToUsers1722600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `Users` ADD `normalized_email` varchar(255) NULL',
    );
    await queryRunner.query(
      'UPDATE `Users` SET `normalized_email` = LOWER(TRIM(`email`))',
    );
    await queryRunner.query(
      'ALTER TABLE `Users` MODIFY `normalized_email` varchar(255) NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `Users` ADD UNIQUE INDEX `IDX_USERS_NORMALIZED_EMAIL` (`normalized_email`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `Users` DROP INDEX `IDX_USERS_NORMALIZED_EMAIL`',
    );
    await queryRunner.query(
      'ALTER TABLE `Users` DROP COLUMN `normalized_email`',
    );
  }
}
