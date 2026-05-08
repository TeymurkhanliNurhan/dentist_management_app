import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDentistFkToRoom1775500000000 implements MigrationInterface {
  name = 'AddDentistFkToRoom1775500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "dentistId" integer`,
    );

    await queryRunner.query(`
      UPDATE "Room"
      SET "clinicId" = 1
      WHERE id = 1 AND "clinicId" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "Room"
      SET "clinicId" = (SELECT id FROM "Clinic" ORDER BY id ASC LIMIT 1)
      WHERE "clinicId" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "Room" r
      SET "dentistId" = (
        SELECT d.id
        FROM "Dentist" d
        INNER JOIN "Staff" s ON s.id = d."staffId"
        WHERE s."clinicId" = r."clinicId"
        ORDER BY d.id ASC
        LIMIT 1
      )
      WHERE r."dentistId" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "Room"
      SET "dentistId" = (SELECT id FROM "Dentist" ORDER BY id ASC LIMIT 1)
      WHERE "dentistId" IS NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_schema = 'public'
            AND table_name = 'Room'
            AND constraint_name = 'FK_Room_dentistId'
        ) THEN
          ALTER TABLE "Room"
          ADD CONSTRAINT "FK_Room_dentistId"
          FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Room' AND column_name = 'dentistId'
        ) AND NOT EXISTS (SELECT 1 FROM "Room" WHERE "dentistId" IS NULL) THEN
          ALTER TABLE "Room" ALTER COLUMN "dentistId" SET NOT NULL;
        END IF;
      END$$;
    `);
  }

  public async down(): Promise<void> {
    // Intentionally empty.
  }
}
