import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Patient belongs to Clinic (0..* patients per clinic) instead of Dentist.
 * Rows with dentist = 1 are assigned clinicId = 1 as requested.
 */
export class PatientClinicFkReplaceDentistFk1775100000000 implements MigrationInterface {
  name = 'PatientClinicFkReplaceDentistFk1775100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "clinicId" integer`);

    await queryRunner.query(`
      UPDATE "Patient" p
      SET "clinicId" = s."clinicId"
      FROM "Dentist" d
      INNER JOIN "Staff" s ON s."id" = d."staffId"
      WHERE p."clinicId" IS NULL
        AND p."dentist" = d."id"
    `);

    await queryRunner.query(`
      UPDATE "Patient"
      SET "clinicId" = 1
      WHERE "dentist" = 1
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_schema = 'public'
            AND table_name = 'Patient'
            AND constraint_name = 'FK_Patient_clinicId'
        ) THEN
          ALTER TABLE "Patient"
          ADD CONSTRAINT "FK_Patient_clinicId"
          FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Patient' AND column_name = 'clinicId'
        ) AND NOT EXISTS (
          SELECT 1 FROM "Patient" WHERE "clinicId" IS NULL
        ) THEN
          ALTER TABLE "Patient" ALTER COLUMN "clinicId" SET NOT NULL;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      DECLARE fk_name text;
      BEGIN
        SELECT tc.constraint_name INTO fk_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.constraint_schema = kcu.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = 'Patient'
          AND kcu.column_name = 'dentist'
        LIMIT 1;

        IF fk_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE "Patient" DROP CONSTRAINT %I', fk_name);
        END IF;
      END$$;
    `);

    await queryRunner.query(`ALTER TABLE "Patient" DROP COLUMN IF EXISTS "dentist"`);
  }

  public async down(): Promise<void> {
    // Intentionally empty: reverse migration is not supported.
  }
}
