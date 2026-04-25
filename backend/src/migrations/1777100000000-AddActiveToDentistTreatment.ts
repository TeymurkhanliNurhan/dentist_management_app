import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActiveToDentistTreatment1777100000000 implements MigrationInterface {
  name = 'AddActiveToDentistTreatment1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Dentist_Treatment"
      ADD COLUMN "active" boolean DEFAULT true
    `);

    await queryRunner.query(`
      UPDATE "Dentist_Treatment"
      SET "active" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Dentist_Treatment"
      DROP COLUMN "active"
    `);
  }
}

