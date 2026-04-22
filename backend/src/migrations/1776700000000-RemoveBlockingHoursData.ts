import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveBlockingHoursData1776700000000
  implements MigrationInterface
{
  name = 'RemoveBlockingHoursData1776700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "Blocking_hours"`);
  }

  public async down(): Promise<void> {
    // Intentionally empty. Data deletion is irreversible.
  }
}
