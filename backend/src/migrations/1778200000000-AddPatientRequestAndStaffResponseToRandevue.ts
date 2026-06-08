import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatientRequestAndStaffResponseToRandevue1778200000000
  implements MigrationInterface
{
  name = 'AddPatientRequestAndStaffResponseToRandevue1778200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Randevue" ADD COLUMN IF NOT EXISTS "patientRequest" text
    `);
    await queryRunner.query(`
      ALTER TABLE "Randevue" ADD COLUMN IF NOT EXISTS "staffResponse" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Randevue" DROP COLUMN IF EXISTS "staffResponse"
    `);
    await queryRunner.query(`
      ALTER TABLE "Randevue" DROP COLUMN IF EXISTS "patientRequest"
    `);
  }
}
