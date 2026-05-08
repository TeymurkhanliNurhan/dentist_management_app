import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetMedicineStockToTwo1776400000000 implements MigrationInterface {
  name = 'SetMedicineStockToTwo1776400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "Medicine"
      SET "stock" = 2
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "Medicine"
      SET "stock" = 0
      WHERE "stock" = 2
    `);
  }
}
