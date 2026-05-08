import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Move Medicine ownership from Dentist to Clinic.
 * Safe to run multiple times (idempotent).
 */
export class ReplaceMedicineDentistFkWithClinicFk1775000000000
  implements MigrationInterface
{
  name = 'ReplaceMedicineDentistFkWithClinicFk1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Medicine" ADD COLUMN IF NOT EXISTS "clinicId" integer`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Medicine' AND column_name = 'dentist'
        ) THEN
          UPDATE "Medicine" m
          SET "clinicId" = s."clinicId"
          FROM "Dentist" d
          INNER JOIN "Staff" s ON s."id" = d."staffId"
          WHERE m."clinicId" IS NULL
            AND m."dentist" = d."id";
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
            AND table_name = 'Medicine'
            AND constraint_name = 'FK_Medicine_clinicId'
        ) THEN
          ALTER TABLE "Medicine"
          ADD CONSTRAINT "FK_Medicine_clinicId"
          FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Medicine' AND column_name = 'clinicId'
        ) AND NOT EXISTS (
          SELECT 1 FROM "Medicine" WHERE "clinicId" IS NULL
        ) THEN
          ALTER TABLE "Medicine" ALTER COLUMN "clinicId" SET NOT NULL;
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
          AND tc.table_name = 'Medicine'
          AND kcu.column_name = 'dentist'
        LIMIT 1;

        IF fk_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE "Medicine" DROP CONSTRAINT %I', fk_name);
        END IF;
      END$$;
    `);

    await queryRunner.query(
      `ALTER TABLE "Medicine" DROP COLUMN IF EXISTS "dentist"`,
    );
  }

  public async down(): Promise<void> {
    // Intentionally empty: reverse migration is not supported.
  }
}
