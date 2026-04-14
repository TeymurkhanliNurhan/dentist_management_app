import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Treatment belongs to Clinic (not Dentist). Existing rows: map via Staff.clinicId;
 * rows with dentist = 1 get clinicId = 1 as requested.
 * Randevue: optional Dentist FK; existing rows get dentist = patient's clinicId (legacy 1:1 id alignment).
 */
export class TreatmentClinicFkAndRandevueDentistFk1775300000000 implements MigrationInterface {
  name = 'TreatmentClinicFkAndRandevueDentistFk1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Treatment" ADD COLUMN IF NOT EXISTS "clinicId" integer`);

    await queryRunner.query(`
      UPDATE "Treatment" t
      SET "clinicId" = s."clinicId"
      FROM "Dentist" d
      INNER JOIN "Staff" s ON s."id" = d."staffId"
      WHERE t."clinicId" IS NULL
        AND t."dentist" = d."id"
    `);

    await queryRunner.query(`
      UPDATE "Treatment"
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
            AND table_name = 'Treatment'
            AND constraint_name = 'FK_Treatment_clinicId'
        ) THEN
          ALTER TABLE "Treatment"
          ADD CONSTRAINT "FK_Treatment_clinicId"
          FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Treatment' AND column_name = 'clinicId'
        ) AND NOT EXISTS (
          SELECT 1 FROM "Treatment" WHERE "clinicId" IS NULL
        ) THEN
          ALTER TABLE "Treatment" ALTER COLUMN "clinicId" SET NOT NULL;
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
          AND tc.table_name = 'Treatment'
          AND kcu.column_name = 'dentist'
        LIMIT 1;

        IF fk_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE "Treatment" DROP CONSTRAINT %I', fk_name);
        END IF;
      END$$;
    `);

    await queryRunner.query(`ALTER TABLE "Treatment" DROP COLUMN IF EXISTS "dentist"`);

    await queryRunner.query(`ALTER TABLE "Randevue" ADD COLUMN IF NOT EXISTS "dentist" integer`);

    await queryRunner.query(`
      UPDATE "Randevue" r
      SET "dentist" = p."clinicId"
      FROM "Patient" p
      WHERE r."patient" = p."id"
        AND r."dentist" IS NULL
        AND EXISTS (SELECT 1 FROM "Dentist" d WHERE d."id" = p."clinicId")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_schema = 'public'
            AND table_name = 'Randevue'
            AND constraint_name = 'FK_Randevue_dentist'
        ) THEN
          ALTER TABLE "Randevue"
          ADD CONSTRAINT "FK_Randevue_dentist"
          FOREIGN KEY ("dentist") REFERENCES "Dentist"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);
  }

  public async down(): Promise<void> {
    // Intentionally empty: reverse migration is not supported.
  }
}
