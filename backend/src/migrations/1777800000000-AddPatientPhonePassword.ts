import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatientPhonePassword1777800000000
  implements MigrationInterface
{
  name = 'AddPatientPhonePassword1777800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "phone" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "password" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Patient" DROP COLUMN IF EXISTS "password"`);
    await queryRunner.query(`ALTER TABLE "Patient" DROP COLUMN IF EXISTS "phone"`);
  }
}

