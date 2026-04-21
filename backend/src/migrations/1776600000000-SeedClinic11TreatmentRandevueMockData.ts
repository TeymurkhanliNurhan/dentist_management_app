import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedClinic11TreatmentRandevueMockData1776600000000
  implements MigrationInterface
{
  name = 'SeedClinic11TreatmentRandevueMockData1776600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH clinic_row AS (
        SELECT id AS clinic_id
        FROM "Clinic"
        WHERE id = 11
        LIMIT 1
      ),
      patient_rows AS (
        SELECT p.id AS patient_id, p."name", p."surname"
        FROM "Patient" p
        INNER JOIN clinic_row c ON c.clinic_id = p."clinicId"
        ORDER BY p.id
        LIMIT 2
      )
      INSERT INTO "Appointment" (
        "startDate", "endDate", "calculatedFee", "chargedFee", "discountFee", "clinicId", "patient"
      )
      SELECT seed."startDate"::date, seed."endDate"::date, seed."calculatedFee",
             seed."chargedFee", seed."discountFee", c.clinic_id, p.patient_id
      FROM clinic_row c
      INNER JOIN patient_rows p ON true
      INNER JOIN (
        VALUES
          ('CL11-MOCK-A-1', '2026-05-03', '2026-05-03', 240, 230, 10),
          ('CL11-MOCK-A-2', '2026-05-05', '2026-05-05', 180, 180, 0)
      ) AS seed("tag", "startDate", "endDate", "calculatedFee", "chargedFee", "discountFee")
        ON (seed."tag" = 'CL11-MOCK-A-1' AND p.patient_id = (SELECT MIN(patient_id) FROM patient_rows))
        OR (seed."tag" = 'CL11-MOCK-A-2' AND p.patient_id = (SELECT MAX(patient_id) FROM patient_rows))
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Appointment" a
        WHERE a."clinicId" = c.clinic_id
          AND a."patient" = p.patient_id
          AND a."startDate" = seed."startDate"::date
      )
    `);

    await queryRunner.query(`
      WITH clinic_row AS (
        SELECT id AS clinic_id
        FROM "Clinic"
        WHERE id = 11
        LIMIT 1
      ),
      dentist_row AS (
        SELECT d.id AS dentist_id
        FROM "Dentist" d
        INNER JOIN "Staff" s ON s.id = d."staffId"
        INNER JOIN clinic_row c ON c.clinic_id = s."clinicId"
        ORDER BY d.id
        LIMIT 1
      ),
      treatment_rows AS (
        SELECT t.id AS treatment_id
        FROM "Treatment" t
        INNER JOIN clinic_row c ON c.clinic_id = t."clinicId"
        ORDER BY t.id
        LIMIT 2
      ),
      patient_rows AS (
        SELECT p.id AS patient_id
        FROM "Patient" p
        INNER JOIN clinic_row c ON c.clinic_id = p."clinicId"
        ORDER BY p.id
        LIMIT 2
      ),
      appointment_rows AS (
        SELECT a.id AS appointment_id, a."patient", a."startDate"
        FROM "Appointment" a
        INNER JOIN clinic_row c ON c.clinic_id = a."clinicId"
        WHERE a."startDate" IN ('2026-05-03'::date, '2026-05-05'::date)
      ),
      patient_tooth_rows AS (
        SELECT pt.patient, pt.tooth
        FROM "Patient_Teeth" pt
        INNER JOIN patient_rows p ON p.patient_id = pt.patient
      )
      INSERT INTO "Tooth_Treatment" (
        "patient", "tooth", "appointment", "treatment", "dentist", "feeSnapshot", "description"
      )
      SELECT seed.patient_id, seed.tooth_id, seed.appointment_id, seed.treatment_id,
             seed.dentist_id, seed.fee_snapshot, seed.description
      FROM (
        SELECT
          p1.patient_id,
          (SELECT tooth FROM patient_tooth_rows ptr WHERE ptr.patient = p1.patient_id ORDER BY tooth LIMIT 1) AS tooth_id,
          (SELECT appointment_id FROM appointment_rows ar WHERE ar."patient" = p1.patient_id AND ar."startDate" = '2026-05-03'::date LIMIT 1) AS appointment_id,
          (SELECT treatment_id FROM treatment_rows ORDER BY treatment_id LIMIT 1) AS treatment_id,
          (SELECT dentist_id FROM dentist_row LIMIT 1) AS dentist_id,
          120::double precision AS fee_snapshot,
          'CL11-MOCK-TT-1'::varchar AS description
        FROM (SELECT MIN(patient_id) AS patient_id FROM patient_rows) p1
        UNION ALL
        SELECT
          p2.patient_id,
          (SELECT tooth FROM patient_tooth_rows ptr WHERE ptr.patient = p2.patient_id ORDER BY tooth LIMIT 1) AS tooth_id,
          (SELECT appointment_id FROM appointment_rows ar WHERE ar."patient" = p2.patient_id AND ar."startDate" = '2026-05-05'::date LIMIT 1) AS appointment_id,
          (SELECT treatment_id FROM treatment_rows ORDER BY treatment_id DESC LIMIT 1) AS treatment_id,
          (SELECT dentist_id FROM dentist_row LIMIT 1) AS dentist_id,
          90::double precision AS fee_snapshot,
          'CL11-MOCK-TT-2'::varchar AS description
        FROM (SELECT MAX(patient_id) AS patient_id FROM patient_rows) p2
      ) AS seed
      WHERE seed.patient_id IS NOT NULL
        AND seed.tooth_id IS NOT NULL
        AND seed.appointment_id IS NOT NULL
        AND seed.treatment_id IS NOT NULL
        AND seed.dentist_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "Tooth_Treatment" tt
          WHERE tt."description" = seed.description
        )
    `);

    await queryRunner.query(`
      WITH tt_rows AS (
        SELECT id, patient, tooth, description
        FROM "Tooth_Treatment"
        WHERE description IN ('CL11-MOCK-TT-1', 'CL11-MOCK-TT-2')
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
      room_row AS (
        SELECT r.id AS room_id
        FROM "Room" r
        INNER JOIN clinic_row c ON c.clinic_id = r."clinicId"
        ORDER BY r.id
        LIMIT 1
      ),
      dentist_row AS (
        SELECT d.id AS dentist_id
        FROM "Dentist" d
        INNER JOIN "Staff" s ON s.id = d."staffId"
        INNER JOIN clinic_row c ON c.clinic_id = s."clinicId"
        ORDER BY d.id
        LIMIT 1
      ),
      tt_rows AS (
        SELECT tt.id AS tooth_treatment_id, tt."appointment", tt.patient, tt.description
        FROM "Tooth_Treatment" tt
        WHERE tt.description IN ('CL11-MOCK-TT-1', 'CL11-MOCK-TT-2')
      )
      INSERT INTO "Randevue" (
        "date", "endTime", "status", "note", "patient", "appointment", "room", "dentist"
      )
      SELECT seed.start_time::timestamp, seed.end_time::timestamp, 'scheduled', seed.note,
             seed.patient_id, seed.appointment_id, rr.room_id, dr.dentist_id
      FROM (
        SELECT
          tt.patient AS patient_id,
          tt."appointment" AS appointment_id,
          '2026-05-03 10:00:00'::timestamp AS start_time,
          '2026-05-03 10:40:00'::timestamp AS end_time,
          'CL11-MOCK-RV-1A'::text AS note
        FROM tt_rows tt
        WHERE tt.description = 'CL11-MOCK-TT-1'
        UNION ALL
        SELECT
          tt.patient AS patient_id,
          tt."appointment" AS appointment_id,
          '2026-05-07 10:00:00'::timestamp AS start_time,
          '2026-05-07 10:30:00'::timestamp AS end_time,
          'CL11-MOCK-RV-1B-LAST'::text AS note
        FROM tt_rows tt
        WHERE tt.description = 'CL11-MOCK-TT-1'
        UNION ALL
        SELECT
          tt.patient AS patient_id,
          tt."appointment" AS appointment_id,
          '2026-05-05 11:00:00'::timestamp AS start_time,
          '2026-05-05 11:20:00'::timestamp AS end_time,
          'CL11-MOCK-RV-2A'::text AS note
        FROM tt_rows tt
        WHERE tt.description = 'CL11-MOCK-TT-2'
      ) AS seed
      CROSS JOIN room_row rr
      CROSS JOIN dentist_row dr
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
        WHERE tt.description IN ('CL11-MOCK-TT-1', 'CL11-MOCK-TT-2')
      ),
      rv_rows AS (
        SELECT rv.id AS randevue_id, rv.note
        FROM "Randevue" rv
        WHERE rv.note IN ('CL11-MOCK-RV-1A', 'CL11-MOCK-RV-1B-LAST', 'CL11-MOCK-RV-2A')
      )
      INSERT INTO "Treatment_Randevue" ("tooth_treatment_teeth_id", "randevue_id")
      SELECT map.ttt_id, map.randevue_id
      FROM (
        SELECT ttt.ttt_id, rv.randevue_id
        FROM ttt_rows ttt
        INNER JOIN rv_rows rv ON rv.note IN ('CL11-MOCK-RV-1A', 'CL11-MOCK-RV-1B-LAST')
        WHERE ttt.description = 'CL11-MOCK-TT-1'
        UNION ALL
        SELECT ttt.ttt_id, rv.randevue_id
        FROM ttt_rows ttt
        INNER JOIN rv_rows rv ON rv.note = 'CL11-MOCK-RV-2A'
        WHERE ttt.description = 'CL11-MOCK-TT-2'
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
