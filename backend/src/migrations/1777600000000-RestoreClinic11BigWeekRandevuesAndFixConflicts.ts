import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreClinic11BigWeekRandevuesAndFixConflicts1777600000000
  implements MigrationInterface
{
  name = 'RestoreClinic11BigWeekRandevuesAndFixConflicts1777600000000';

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
      target_tt AS (
        SELECT
          tt.id AS tooth_treatment_id,
          tt."appointment" AS appointment_id,
          tt.patient AS patient_id,
          tt."dentist" AS dentist_id,
          REPLACE(tt."description", '-TT-', '-RV-') AS rv_note,
          a."startDate" AS appt_date
        FROM "Tooth_Treatment" tt
        INNER JOIN "Appointment" a ON a.id = tt."appointment"
        INNER JOIN clinic_row c ON c.clinic_id = a."clinicId"
        WHERE tt."description" LIKE 'CL11-BIGWEEK-TT-%'
           OR tt."description" LIKE 'CL11-BIGWEEK-D13-TT-%'
      ),
      missing_tt AS (
        SELECT
          t.*
        FROM target_tt t
        LEFT JOIN "Randevue" rv ON rv.note = t.rv_note
        WHERE rv.id IS NULL
      ),
      missing_with_slot AS (
        SELECT
          m.*,
          ROW_NUMBER() OVER (
            PARTITION BY m.appt_date
            ORDER BY m.dentist_id, m.tooth_treatment_id
          ) AS slot_rn
        FROM missing_tt m
      )
      INSERT INTO "Randevue" (
        "date",
        "endTime",
        "status",
        "note",
        "patient",
        "appointment",
        "room",
        "dentist"
      )
      SELECT
        (
          m.appt_date::timestamp
          + interval '8 hours'
          + ((m.slot_rn - 1) * interval '45 minutes')
        ) AS start_time,
        (
          m.appt_date::timestamp
          + interval '8 hours 30 minutes'
          + ((m.slot_rn - 1) * interval '45 minutes')
        ) AS end_time,
        'scheduled',
        m.rv_note,
        m.patient_id,
        m.appointment_id,
        rr.room_id,
        m.dentist_id
      FROM missing_with_slot m
      INNER JOIN room_count rc ON rc.total > 0
      INNER JOIN room_rows rr ON rr.room_rn = ((m.slot_rn - 1) % rc.total) + 1
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Randevue" rv
        WHERE rv.note = m.rv_note
      )
    `);

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
          rv.dentist AS dentist_id,
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
            + interval '8 hours'
            + ((tr.slot_rn - 1) * interval '45 minutes')
          ) AS start_time,
          (
            tr.appt_date::timestamp
            + interval '8 hours 30 minutes'
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
        "room" = rr.room_id,
        "dentist" = rv.dentist
      FROM schedule_rows sr
      INNER JOIN room_rows rr ON rr.room_rn = sr.room_rn
      WHERE rv.id = sr.randevue_id
    `);

    await queryRunner.query(`
      WITH ttt_rows AS (
        SELECT
          ttt.id AS ttt_id,
          REPLACE(tt."description", '-TT-', '-RV-') AS rv_note
        FROM "ToothTreatmentTeeth" ttt
        INNER JOIN "Tooth_Treatment" tt ON tt.id = ttt."tooth_treatment_id"
        WHERE tt."description" LIKE 'CL11-BIGWEEK-TT-%'
           OR tt."description" LIKE 'CL11-BIGWEEK-D13-TT-%'
      ),
      rv_rows AS (
        SELECT rv.id AS randevue_id, rv.note
        FROM "Randevue" rv
        WHERE rv.note LIKE 'CL11-BIGWEEK-RV-%'
           OR rv.note LIKE 'CL11-BIGWEEK-D13-RV-%'
      )
      INSERT INTO "Treatment_Randevue" ("tooth_treatment_teeth_id", "randevue_id")
      SELECT ttt.ttt_id, rv.randevue_id
      FROM ttt_rows ttt
      INNER JOIN rv_rows rv ON rv.note = ttt.rv_note
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Treatment_Randevue" tr
        WHERE tr."tooth_treatment_teeth_id" = ttt.ttt_id
          AND tr."randevue_id" = rv.randevue_id
      )
    `);
  }

  public async down(): Promise<void> {
    // Intentionally empty. This migration restores seeded data consistency.
  }
}
