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
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = 'Patient'
            AND constraint_name = 'UQ_Patient_phone'
        ) THEN
          ALTER TABLE "Patient" ADD CONSTRAINT "UQ_Patient_phone" UNIQUE ("phone");
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Patient" DROP CONSTRAINT IF EXISTS "UQ_Patient_phone"`,
    );
    await queryRunner.query(`ALTER TABLE "Patient" DROP COLUMN IF EXISTS "password"`);
    await queryRunner.query(`ALTER TABLE "Patient" DROP COLUMN IF EXISTS "phone"`);
  }
}

