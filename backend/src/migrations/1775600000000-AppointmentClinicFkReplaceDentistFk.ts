import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Appointment belongs to Clinic (not Dentist).
 * Existing rows are backfilled from Dentist -> Staff.clinicId.
 * Legacy compatibility fallback: appointment.clinicId = appointment.dentist.
 */
export class AppointmentClinicFkReplaceDentistFk1775600000000
  implements MigrationInterface
{
  name = 'AppointmentClinicFkReplaceDentistFk1775600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "clinicId" integer`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Appointment' AND column_name = 'dentist'
        ) THEN
          UPDATE "Appointment" a
          SET "clinicId" = s."clinicId"
          FROM "Dentist" d
          INNER JOIN "Staff" s ON s."id" = d."staffId"
          WHERE a."clinicId" IS NULL
            AND a."dentist" = d."id";

          UPDATE "Appointment" a
          SET "clinicId" = a."dentist"
          WHERE a."clinicId" IS NULL
            AND a."dentist" IS NOT NULL
            AND EXISTS (SELECT 1 FROM "Clinic" c WHERE c."id" = a."dentist");
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_schema = 'public'
            AND table_name = 'Appointment'
            AND constraint_name = 'FK_Appointment_clinicId'
        ) THEN
          ALTER TABLE "Appointment"
          ADD CONSTRAINT "FK_Appointment_clinicId"
          FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Appointment' AND column_name = 'clinicId'
        ) AND NOT EXISTS (
          SELECT 1 FROM "Appointment" WHERE "clinicId" IS NULL
        ) THEN
          ALTER TABLE "Appointment" ALTER COLUMN "clinicId" SET NOT NULL;
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
          AND tc.table_name = 'Appointment'
          AND kcu.column_name = 'dentist'
        LIMIT 1;

        IF fk_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE "Appointment" DROP CONSTRAINT %I', fk_name);
        END IF;
      END$$;
    `);

    await queryRunner.query(
      `ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "dentist"`,
    );
  }

  public async down(): Promise<void> {
    // Intentionally empty: reverse migration is not supported.
  }
}
