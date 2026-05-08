import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTreatmentPricePer1772000000000 implements MigrationInterface {
  name = 'AddTreatmentPricePer1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Treatment" ADD COLUMN IF NOT EXISTS "pricePer" character varying(10) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Treatment" DROP COLUMN IF EXISTS "pricePer"`,
    );
  }
}
