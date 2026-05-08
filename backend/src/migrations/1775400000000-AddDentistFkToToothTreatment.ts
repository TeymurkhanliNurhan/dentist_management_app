import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDentistFkToToothTreatment1775400000000
  implements MigrationInterface
{
  name = 'AddDentistFkToToothTreatment1775400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Tooth_Treatment" ADD COLUMN IF NOT EXISTS "dentist" integer`,
    );

    await queryRunner.query(`
      UPDATE "Tooth_Treatment" tt
      SET "dentist" = p."clinicId"
      FROM "Appointment" a
      INNER JOIN "Patient" p ON p."id" = a."patient"
      WHERE tt."appointment" = a."id"
        AND tt."dentist" IS NULL
        AND EXISTS (SELECT 1 FROM "Dentist" d WHERE d."id" = p."clinicId")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_schema = 'public'
            AND table_name = 'Tooth_Treatment'
            AND constraint_name = 'FK_ToothTreatment_dentist'
        ) THEN
          ALTER TABLE "Tooth_Treatment"
          ADD CONSTRAINT "FK_ToothTreatment_dentist"
          FOREIGN KEY ("dentist") REFERENCES "Dentist"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'Tooth_Treatment'
            AND column_name = 'dentist'
        ) AND NOT EXISTS (
          SELECT 1 FROM "Tooth_Treatment" WHERE "dentist" IS NULL
        ) THEN
          ALTER TABLE "Tooth_Treatment" ALTER COLUMN "dentist" SET NOT NULL;
        END IF;
      END$$;
    `);
  }

  public async down(): Promise<void> {
    // Intentionally empty: reverse migration is not supported.
  }
}
