import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Allow Randevue.room to be NULL for patient-requested slots (staff assigns room later).
 */
export class MakeRandevueRoomNullableForRequested1778100000000
  implements MigrationInterface
{
  name = 'MakeRandevueRoomNullableForRequested1778100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Randevue" ALTER COLUMN "room" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "Randevue" r
      SET "room" = COALESCE(
        r."room",
        (
          SELECT rm.id
          FROM "Room" rm
          INNER JOIN "Patient" p ON p.id = r.patient
          WHERE rm."clinicId" = p."clinicId"
          ORDER BY rm.id ASC
          LIMIT 1
        ),
        (SELECT id FROM "Room" ORDER BY id ASC LIMIT 1)
      )
      WHERE r."room" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "Randevue" ALTER COLUMN "room" SET NOT NULL
    `);
  }
}
