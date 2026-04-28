import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixClinic11WeekRandevueSeed1777300000000
  implements MigrationInterface
{
  name = 'FixClinic11WeekRandevueSeed1777300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH clinic_row AS (
        SELECT id AS clinic_id
        FROM "Clinic"
        WHERE id = 11
        LIMIT 1
      ),
      patient_rows AS (
        SELECT p.id AS patient_id, ROW_NUMBER() OVER (ORDER BY p.id) AS rn
        FROM "Patient" p
        INNER JOIN clinic_row c ON c.clinic_id = p."clinicId"
        ORDER BY p.id
        LIMIT 5
      )
      INSERT INTO "Appointment" (
        "startDate", "endDate", "calculatedFee", "chargedFee", "discountFee", "clinicId", "patient"
      )
      SELECT seed.appt_date::date, seed.appt_date::date, seed.calculated_fee,
             seed.charged_fee, seed.discount_fee, c.clinic_id, p.patient_id
      FROM clinic_row c
      INNER JOIN (
        VALUES
          (1, '2026-04-27', 210, 200, 10),
          (2, '2026-04-28', 295, 280, 15),
          (3, '2026-04-29', 180, 180, 0),
          (4, '2026-05-01', 265, 250, 15),
          (5, '2026-05-03', 240, 225, 15)
      ) AS seed(patient_rn, appt_date, calculated_fee, charged_fee, discount_fee)
        ON true
      INNER JOIN patient_rows p ON p.rn = seed.patient_rn
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Appointment" a
        WHERE a."clinicId" = c.clinic_id
          AND a."patient" = p.patient_id
          AND a."startDate" = seed.appt_date::date
      )
    `);

    await queryRunner.query(`
      WITH clinic_row AS (
        SELECT id AS clinic_id
        FROM "Clinic"
        WHERE id = 11
        LIMIT 1
      ),
      patient_rows AS (
        SELECT p.id AS patient_id, ROW_NUMBER() OVER (ORDER BY p.id) AS rn
        FROM "Patient" p
        INNER JOIN clinic_row c ON c.clinic_id = p."clinicId"
        ORDER BY p.id
        LIMIT 5
      ),
      appointment_rows AS (
        SELECT
          a.id AS appointment_id,
          a."patient",
          a."startDate",
          ROW_NUMBER() OVER (PARTITION BY a."patient" ORDER BY a.id) AS appt_rn
        FROM "Appointment" a
        INNER JOIN clinic_row c ON c.clinic_id = a."clinicId"
        WHERE a."startDate" IN (
          '2026-04-27'::date,
          '2026-04-28'::date,
          '2026-04-29'::date,
          '2026-05-01'::date,
          '2026-05-03'::date
        )
      ),
      patient_appointments AS (
        SELECT p.rn AS patient_rn, p.patient_id, a.appointment_id
        FROM patient_rows p
        INNER JOIN appointment_rows a
          ON a."patient" = p.patient_id
         AND a.appt_rn = 1
      ),
      dentist_rows AS (
        SELECT d.id AS dentist_id, ROW_NUMBER() OVER (ORDER BY d.id) AS rn
        FROM "Dentist" d
        INNER JOIN "Staff" s ON s.id = d."staffId"
        INNER JOIN clinic_row c ON c.clinic_id = s."clinicId"
        ORDER BY d.id
        LIMIT 3
      ),
      treatment_rows AS (
        SELECT t.id AS treatment_id, ROW_NUMBER() OVER (ORDER BY t.id) AS rn
        FROM "Treatment" t
        INNER JOIN clinic_row c ON c.clinic_id = t."clinicId"
        ORDER BY t.id
        LIMIT 6
      ),
      patient_teeth AS (
        SELECT pt.patient, pt.tooth, ROW_NUMBER() OVER (PARTITION BY pt.patient ORDER BY pt.tooth) AS tooth_rn
        FROM "Patient_Teeth" pt
        INNER JOIN patient_rows p ON p.patient_id = pt.patient
      )
      INSERT INTO "Tooth_Treatment" (
        "patient", "tooth", "appointment", "treatment", "dentist", "feeSnapshot", "description"
      )
      SELECT pa.patient_id, pt.tooth, pa.appointment_id, tr.treatment_id, dr.dentist_id,
             seed.fee_snapshot, seed.description
      FROM (
        VALUES
          (1, 1, 1, 1, 80,  'CL11-WEEK2-TT-1'),
          (1, 2, 2, 2, 120, 'CL11-WEEK2-TT-2'),
          (2, 1, 3, 3, 95,  'CL11-WEEK2-TT-3'),
          (2, 2, 4, 1, 175, 'CL11-WEEK2-TT-4'),
          (3, 1, 5, 2, 165, 'CL11-WEEK2-TT-5'),
          (4, 1, 6, 3, 140, 'CL11-WEEK2-TT-6')
      ) AS seed(patient_rn, tooth_rn, treatment_rn, dentist_rn, fee_snapshot, description)
      INNER JOIN patient_appointments pa ON pa.patient_rn = seed.patient_rn
      INNER JOIN patient_teeth pt ON pt.patient = pa.patient_id AND pt.tooth_rn = seed.tooth_rn
      INNER JOIN treatment_rows tr ON tr.rn = seed.treatment_rn
      INNER JOIN dentist_rows dr ON dr.rn = seed.dentist_rn
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Tooth_Treatment" tt
        WHERE tt."description" = seed.description
      )
    `);

    await queryRunner.query(`
      WITH tt_rows AS (
        SELECT id, patient, tooth, description
        FROM "Tooth_Treatment"
        WHERE description LIKE 'CL11-WEEK2-TT-%'
      )
      INSERT INTO "ToothTreatmentTeeth" ("tooth_treatment_id", "patient_id", "tooth_id")
      SELECT tt.id, tt.patient, tt.tooth
      FROM tt_rows tt
      WHERE tt.tooth IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM "Patient_Teeth" pt
          WHERE pt.patient = tt.patient
            AND pt.tooth = tt.tooth
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "ToothTreatmentTeeth" ttt
          WHERE ttt."tooth_treatment_id" = tt.id
            AND ttt."patient_id" = tt.patient
            AND ttt."tooth_id" = tt.tooth
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
        SELECT r.id AS room_id, ROW_NUMBER() OVER (ORDER BY r.id) AS rn
        FROM "Room" r
        INNER JOIN clinic_row c ON c.clinic_id = r."clinicId"
        ORDER BY r.id
        LIMIT 3
      ),
      dentist_rows AS (
        SELECT d.id AS dentist_id, ROW_NUMBER() OVER (ORDER BY d.id) AS rn
        FROM "Dentist" d
        INNER JOIN "Staff" s ON s.id = d."staffId"
        INNER JOIN clinic_row c ON c.clinic_id = s."clinicId"
        ORDER BY d.id
        LIMIT 3
      ),
      tt_rows AS (
        SELECT tt.id, tt."appointment", tt.patient, tt.description, ROW_NUMBER() OVER (ORDER BY tt.id) AS rn
        FROM "Tooth_Treatment" tt
        WHERE tt.description LIKE 'CL11-WEEK2-TT-%'
      )
      INSERT INTO "Randevue" (
        "date", "endTime", "status", "note", "patient", "appointment", "room", "dentist"
      )
      SELECT seed.start_time::timestamp, seed.end_time::timestamp, 'scheduled', seed.note,
             tt.patient, tt."appointment", rr.room_id, dr.dentist_id
      FROM (
        VALUES
          (1, 1, 1, '2026-04-27 09:15:00', '2026-04-27 09:45:00', 'CL11-WEEK2-RV-1'),
          (2, 2, 2, '2026-04-28 10:10:00', '2026-04-28 10:45:00', 'CL11-WEEK2-RV-2'),
          (3, 3, 3, '2026-04-29 11:20:00', '2026-04-29 11:55:00', 'CL11-WEEK2-RV-3'),
          (4, 1, 1, '2026-05-01 13:00:00', '2026-05-01 13:30:00', 'CL11-WEEK2-RV-4'),
          (5, 2, 2, '2026-05-03 14:10:00', '2026-05-03 14:50:00', 'CL11-WEEK2-RV-5'),
          (6, 3, 3, '2026-05-03 15:20:00', '2026-05-03 15:55:00', 'CL11-WEEK2-RV-6')
      ) AS seed(tt_rn, room_rn, dentist_rn, start_time, end_time, note)
      INNER JOIN tt_rows tt ON tt.rn = seed.tt_rn
      INNER JOIN room_rows rr ON rr.rn = seed.room_rn
      INNER JOIN dentist_rows dr ON dr.rn = seed.dentist_rn
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Randevue" rv
        WHERE rv.note = seed.note
      )
    `);

    await queryRunner.query(`
      WITH ttt_rows AS (
        SELECT ttt.id AS ttt_id, tt.description
        FROM "ToothTreatmentTeeth" ttt
        INNER JOIN "Tooth_Treatment" tt ON tt.id = ttt."tooth_treatment_id"
        WHERE tt.description LIKE 'CL11-WEEK2-TT-%'
      ),
      rv_rows AS (
        SELECT rv.id AS randevue_id, rv.note
        FROM "Randevue" rv
        WHERE rv.note LIKE 'CL11-WEEK2-RV-%'
      )
      INSERT INTO "Treatment_Randevue" ("tooth_treatment_teeth_id", "randevue_id")
      SELECT map.ttt_id, map.randevue_id
      FROM (
        SELECT ttt.ttt_id, rv.randevue_id
        FROM ttt_rows ttt
        INNER JOIN rv_rows rv
          ON rv.note = REPLACE(ttt.description, 'TT', 'RV')
      ) AS map
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Treatment_Randevue" tr
        WHERE tr."tooth_treatment_teeth_id" = map.ttt_id
          AND tr."randevue_id" = map.randevue_id
      )
    `);
  }

  public async down(): Promise<void> {
    // Intentionally empty. This migration seeds mock data.
  }
}
