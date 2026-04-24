import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMedicineStockLimit1777000000000 implements MigrationInterface {
  name = 'AddMedicineStockLimit1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Medicine"
      ADD COLUMN "stockLimit" integer
    `);

    await queryRunner.query(`
      UPDATE "Medicine"
      SET "stockLimit" = 5
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Medicine"
      DROP COLUMN "stockLimit"
    `);
  }
}
