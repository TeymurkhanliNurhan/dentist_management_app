import { MigrationInterface, QueryRunner } from 'typeorm';

const GENERAL_ROOM_DESCRIPTION = 'Ümumi stomotologiya otağı';

/**
 * Room belongs to Clinic; one default general dentistry room per clinic.
 * Randevue: required room FK, optional nurse FK; existing rows get clinic room via patient.
 */
export class RandevueRoomNurseAndClinicRooms1775200000000 implements MigrationInterface {
  name = 'RandevueRoomNurseAndClinicRooms1775200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "clinicId" integer`);

    const esc = GENERAL_ROOM_DESCRIPTION.replace(/'/g, "''");
    await queryRunner.query(`
      INSERT INTO "Room" ("number", "description", "clinicId")
      SELECT '1', '${esc}', c.id
      FROM "Clinic" c
      WHERE NOT EXISTS (
        SELECT 1 FROM "Room" r
        WHERE r."clinicId" = c.id AND r."description" = '${esc}'
      )
    `);

    await queryRunner.query(`
      UPDATE "Room"
      SET "clinicId" = (SELECT id FROM "Clinic" ORDER BY id ASC LIMIT 1)
      WHERE "clinicId" IS NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_schema = 'public'
            AND table_name = 'Room'
            AND constraint_name = 'FK_Room_clinicId'
        ) THEN
          ALTER TABLE "Room"
          ADD CONSTRAINT "FK_Room_clinicId"
          FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Room' AND column_name = 'clinicId'
        ) AND NOT EXISTS (SELECT 1 FROM "Room" WHERE "clinicId" IS NULL) THEN
          ALTER TABLE "Room" ALTER COLUMN "clinicId" SET NOT NULL;
        END IF;
      END$$;
    `);

    await queryRunner.query(`ALTER TABLE "Randevue" ADD COLUMN IF NOT EXISTS "room" integer`);
    await queryRunner.query(`ALTER TABLE "Randevue" ADD COLUMN IF NOT EXISTS "nurse" integer`);

    await queryRunner.query(`
      UPDATE "Randevue" r
      SET "room" = COALESCE(
        (
          SELECT rm.id
          FROM "Room" rm
          INNER JOIN "Patient" p ON p.id = r.patient
          WHERE rm."clinicId" = p."clinicId"
            AND rm.description = '${esc}'
          ORDER BY rm.id ASC
          LIMIT 1
        ),
        (SELECT id FROM "Room" ORDER BY id ASC LIMIT 1)
      )
      WHERE r."room" IS NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_schema = 'public'
            AND table_name = 'Randevue'
            AND constraint_name = 'FK_Randevue_room'
        ) THEN
          ALTER TABLE "Randevue"
          ADD CONSTRAINT "FK_Randevue_room"
          FOREIGN KEY ("room") REFERENCES "Room"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_schema = 'public'
            AND table_name = 'Randevue'
            AND constraint_name = 'FK_Randevue_nurse'
        ) THEN
          ALTER TABLE "Randevue"
          ADD CONSTRAINT "FK_Randevue_nurse"
          FOREIGN KEY ("nurse") REFERENCES "Nurse"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Randevue' AND column_name = 'room'
        ) AND NOT EXISTS (SELECT 1 FROM "Randevue" WHERE "room" IS NULL) THEN
          ALTER TABLE "Randevue" ALTER COLUMN "room" SET NOT NULL;
        END IF;
      END$$;
    `);
  }

  public async down(): Promise<void> {
    // Intentionally empty.
  }
}
