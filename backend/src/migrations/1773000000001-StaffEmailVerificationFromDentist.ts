import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotent follow-up: if an older DB already ran a partial restructure,
 * ensure Staff has verification columns, copy from Dentist when still present,
 * then drop verification columns from Dentist.
 */
export class StaffEmailVerificationFromDentist1773000000001 implements MigrationInterface {
  name = 'StaffEmailVerificationFromDentist1773000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "isEmailVerified" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "verificationCode" character varying(6) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "verificationCodeExpiry" timestamp NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Dentist' AND column_name = 'staffId'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Dentist' AND column_name = 'isEmailVerified'
        ) THEN
          UPDATE "Staff" s
          SET
            "isEmailVerified" = COALESCE(d."isEmailVerified", false),
            "verificationCode" = d."verificationCode",
            "verificationCodeExpiry" = d."verificationCodeExpiry"
          FROM "Dentist" d
          WHERE d."staffId" = s."id";
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Dentist' AND column_name = 'staffId'
        ) THEN
          ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "isEmailVerified";
          ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "verificationCode";
          ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "verificationCodeExpiry";
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Staff" DROP COLUMN IF EXISTS "isEmailVerified"`);
    await queryRunner.query(`ALTER TABLE "Staff" DROP COLUMN IF EXISTS "verificationCode"`);
    await queryRunner.query(`ALTER TABLE "Staff" DROP COLUMN IF EXISTS "verificationCodeExpiry"`);
  }
}
