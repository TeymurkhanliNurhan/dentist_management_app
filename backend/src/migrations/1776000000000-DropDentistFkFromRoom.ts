import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropDentistFkFromRoom1776000000000
  implements MigrationInterface
{
  name = 'DropDentistFkFromRoom1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE fk_name text;
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'Room'
            AND column_name = 'dentistId'
        ) THEN
          UPDATE "Room" SET "dentistId" = NULL WHERE "dentistId" IS NOT NULL;
        END IF;

        FOR fk_name IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'Room'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'dentistId'
        LOOP
          EXECUTE format('ALTER TABLE "Room" DROP CONSTRAINT IF EXISTS %I', fk_name);
        END LOOP;
      END$$;
    `);

    await queryRunner.query(`
      ALTER TABLE "Room" DROP COLUMN IF EXISTS "dentistId"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "dentistId" integer
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
      ALTER TABLE "Room"
      ADD CONSTRAINT "FK_Room_dentistId"
      FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id") ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "Room" ALTER COLUMN "dentistId" SET NOT NULL
    `);
  }
}
