import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixClinic11BigWeekRandevueConflicts1777500000000
  implements MigrationInterface
{
  name = 'FixClinic11BigWeekRandevueConflicts1777500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH clinic_row AS (
        SELECT id AS clinic_id
        FROM "Clinic"
        WHERE id = 11
        LIMIT 1
      ),
      room_rows AS (
        SELECT
          r.id AS room_id,
          ROW_NUMBER() OVER (ORDER BY r.id) AS room_rn
        FROM "Room" r
        INNER JOIN clinic_row c ON c.clinic_id = r."clinicId"
      ),
      room_count AS (
        SELECT COUNT(*)::int AS total FROM room_rows
      ),
      target_rows AS (
        SELECT
          rv.id AS randevue_id,
          rv.dentist,
          a."startDate" AS appt_date,
          ROW_NUMBER() OVER (
            PARTITION BY a."startDate"
            ORDER BY rv.dentist, rv.id
          ) AS slot_rn
        FROM "Randevue" rv
        INNER JOIN "Appointment" a ON a.id = rv."appointment"
        INNER JOIN clinic_row c ON c.clinic_id = a."clinicId"
        WHERE rv.note LIKE 'CL11-BIGWEEK-RV-%'
           OR rv.note LIKE 'CL11-BIGWEEK-D13-RV-%'
      ),
      schedule_rows AS (
        SELECT
          tr.randevue_id,
          (
            tr.appt_date::timestamp
            + interval '18 hours'
            + ((tr.slot_rn - 1) * interval '45 minutes')
          ) AS start_time,
          (
            tr.appt_date::timestamp
            + interval '18 hours 30 minutes'
            + ((tr.slot_rn - 1) * interval '45 minutes')
          ) AS end_time,
          ((tr.slot_rn - 1) % rc.total) + 1 AS room_rn
        FROM target_rows tr
        CROSS JOIN room_count rc
        WHERE rc.total > 0
      )
      UPDATE "Randevue" rv
      SET
        "date" = sr.start_time,
        "endTime" = sr.end_time,
        "room" = rr.room_id
      FROM schedule_rows sr
      INNER JOIN room_rows rr ON rr.room_rn = sr.room_rn
      WHERE rv.id = sr.randevue_id
    `);
  }

  public async down(): Promise<void> {
    // Intentionally empty. This migration adjusts seeded schedule data.
  }
}
