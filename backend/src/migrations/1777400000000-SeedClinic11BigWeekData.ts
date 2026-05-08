import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedClinic11BigWeekData1777400000000
  implements MigrationInterface
{
  name = 'SeedClinic11BigWeekData1777400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH clinic_row AS (
        SELECT id AS clinic_id
        FROM "Clinic"
        WHERE id = 11
        LIMIT 1
      ),
      dentist_rows AS (
        SELECT
          d.id AS dentist_id,
          ROW_NUMBER() OVER (ORDER BY d.id) AS rn
        FROM "Dentist" d
        INNER JOIN "Staff" s ON s.id = d."staffId"
        INNER JOIN clinic_row c ON c.clinic_id = s."clinicId"
      ),
      treatment_rows AS (
        SELECT
          t.id AS treatment_id,
          ROW_NUMBER() OVER (ORDER BY t.id) AS rn
        FROM "Treatment" t
        INNER JOIN clinic_row c ON c.clinic_id = t."clinicId"
        ORDER BY t.id
        LIMIT 8
      )
      INSERT INTO "Dentist_Treatment" ("Treatment", "Dentist", "active")
      SELECT tr.treatment_id, dr.dentist_id, true
      FROM treatment_rows tr
      CROSS JOIN dentist_rows dr
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Dentist_Treatment" dt
        WHERE dt."Treatment" = tr.treatment_id
          AND dt."Dentist" = dr.dentist_id
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
        SELECT
          p.id AS patient_id,
          ROW_NUMBER() OVER (ORDER BY p.id) AS patient_rn
        FROM "Patient" p
        INNER JOIN clinic_row c ON c.clinic_id = p."clinicId"
        ORDER BY p.id
        LIMIT 12
      ),
      day_rows AS (
        SELECT
          gs::date AS appt_date,
          ROW_NUMBER() OVER (ORDER BY gs) AS day_rn
        FROM generate_series(
          '2026-05-04'::date,
          '2026-05-10'::date,
          interval '1 day'
        ) gs
      )
      INSERT INTO "Appointment" (
        "startDate",
        "endDate",
        "calculatedFee",
        "chargedFee",
        "discountFee",
        "clinicId",
        "patient"
      )
      SELECT
        d.appt_date,
        d.appt_date,
        (180 + (p.patient_rn * 7) + (d.day_rn * 11))::double precision AS calculated_fee,
        (170 + (p.patient_rn * 7) + (d.day_rn * 10))::double precision AS charged_fee,
        (10 + (d.day_rn % 4) * 5)::double precision AS discount_fee,
        c.clinic_id,
        p.patient_id
      FROM clinic_row c
      CROSS JOIN patient_rows p
      CROSS JOIN day_rows d
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Appointment" a
        WHERE a."clinicId" = c.clinic_id
          AND a."patient" = p.patient_id
          AND a."startDate" = d.appt_date
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
        SELECT
          p.id AS patient_id,
          ROW_NUMBER() OVER (ORDER BY p.id) AS patient_rn
        FROM "Patient" p
        INNER JOIN clinic_row c ON c.clinic_id = p."clinicId"
        ORDER BY p.id
        LIMIT 12
      ),
      patient_teeth AS (
        SELECT
          pt.patient,
          pt.tooth,
          ROW_NUMBER() OVER (PARTITION BY pt.patient ORDER BY pt.tooth) AS tooth_rn
        FROM "Patient_Teeth" pt
        INNER JOIN patient_rows p ON p.patient_id = pt.patient
      ),
      day_rows AS (
        SELECT gs::date AS appt_date
        FROM generate_series(
          '2026-05-04'::date,
          '2026-05-10'::date,
          interval '1 day'
        ) gs
      ),
      appointment_rows AS (
        SELECT
          a.id AS appointment_id,
          a."patient",
          a."startDate",
          ROW_NUMBER() OVER (ORDER BY a."startDate", a.id) AS seq_rn
        FROM "Appointment" a
        INNER JOIN clinic_row c ON c.clinic_id = a."clinicId"
        INNER JOIN patient_rows p ON p.patient_id = a."patient"
        INNER JOIN day_rows d ON d.appt_date = a."startDate"
      ),
      dentist_rows AS (
        SELECT
          d.id AS dentist_id,
          ROW_NUMBER() OVER (ORDER BY d.id) AS dentist_rn
        FROM "Dentist" d
        INNER JOIN "Staff" s ON s.id = d."staffId"
        INNER JOIN clinic_row c ON c.clinic_id = s."clinicId"
      ),
      dentist_count AS (
        SELECT COUNT(*)::int AS total FROM dentist_rows
      ),
      treatment_rows AS (
        SELECT
          t.id AS treatment_id,
          ROW_NUMBER() OVER (ORDER BY t.id) AS treatment_rn
        FROM "Treatment" t
        INNER JOIN clinic_row c ON c.clinic_id = t."clinicId"
        ORDER BY t.id
        LIMIT 8
      ),
      treatment_count AS (
        SELECT COUNT(*)::int AS total FROM treatment_rows
      ),
      base_seed AS (
        SELECT
          a.appointment_id,
          a."patient" AS patient_id,
          a.seq_rn,
          ('CL11-BIGWEEK-TT-' || a.seq_rn::text) AS description
        FROM appointment_rows a
      ),
      extra_d13_seed AS (
        SELECT
          a.appointment_id,
          a."patient" AS patient_id,
          a.seq_rn,
          ('CL11-BIGWEEK-D13-TT-' || a.seq_rn::text) AS description
        FROM appointment_rows a
        WHERE EXISTS (SELECT 1 FROM dentist_rows dr WHERE dr.dentist_id = 13)
          AND a.seq_rn <= 28
      ),
      seed_rows AS (
        SELECT * FROM base_seed
        UNION ALL
        SELECT * FROM extra_d13_seed
      )
      INSERT INTO "Tooth_Treatment" (
        "patient",
        "tooth",
        "appointment",
        "treatment",
        "dentist",
        "feeSnapshot",
        "description"
      )
      SELECT
        s.patient_id,
        pt.tooth,
        s.appointment_id,
        tr.treatment_id,
        dr.dentist_id,
        (90 + (s.seq_rn % 9) * 15)::double precision AS fee_snapshot,
        s.description
      FROM seed_rows s
      INNER JOIN patient_teeth pt
        ON pt.patient = s.patient_id
       AND pt.tooth_rn = CASE
         WHEN s.description LIKE 'CL11-BIGWEEK-D13-TT-%' THEN 2
         ELSE 1
       END
      INNER JOIN dentist_count dc ON dc.total > 0
      INNER JOIN treatment_count tc ON tc.total > 0
      INNER JOIN dentist_rows dr
        ON dr.dentist_rn = CASE
          WHEN s.description LIKE 'CL11-BIGWEEK-D13-TT-%'
            THEN (SELECT dentist_rn FROM dentist_rows WHERE dentist_id = 13 LIMIT 1)
          ELSE ((s.seq_rn - 1) % dc.total) + 1
        END
      INNER JOIN treatment_rows tr
        ON tr.treatment_rn = ((s.seq_rn - 1) % tc.total) + 1
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Tooth_Treatment" tt
        WHERE tt."description" = s.description
      )
    `);

    await queryRunner.query(`
      WITH tt_rows AS (
        SELECT id, patient, tooth
        FROM "Tooth_Treatment"
        WHERE "description" LIKE 'CL11-BIGWEEK-TT-%'
           OR "description" LIKE 'CL11-BIGWEEK-D13-TT-%'
      )
      INSERT INTO "ToothTreatmentTeeth" (
        "tooth_treatment_id",
        "patient_id",
        "tooth_id"
      )
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
        SELECT
          r.id AS room_id,
          ROW_NUMBER() OVER (ORDER BY r.id) AS room_rn
        FROM "Room" r
        INNER JOIN clinic_row c ON c.clinic_id = r."clinicId"
      ),
      room_count AS (
        SELECT COUNT(*)::int AS total FROM room_rows
      ),
      tt_rows AS (
        SELECT
          tt.id AS tooth_treatment_id,
          tt."appointment" AS appointment_id,
          tt.patient AS patient_id,
          tt."dentist" AS dentist_id,
          tt."description",
          ROW_NUMBER() OVER (ORDER BY tt.id) AS tt_rn
        FROM "Tooth_Treatment" tt
        WHERE tt."description" LIKE 'CL11-BIGWEEK-TT-%'
           OR tt."description" LIKE 'CL11-BIGWEEK-D13-TT-%'
      ),
      appointment_rows AS (
        SELECT a.id AS appointment_id, a."startDate" AS appt_date
        FROM "Appointment" a
        INNER JOIN clinic_row c ON c.clinic_id = a."clinicId"
        WHERE a."startDate" BETWEEN '2026-05-04'::date AND '2026-05-10'::date
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
          ar.appt_date::timestamp
          + ((9 + (tt.tt_rn % 8))::text || ' hours')::interval
          + (((tt.tt_rn % 2) * 30)::text || ' minutes')::interval
        ) AS start_time,
        (
          ar.appt_date::timestamp
          + ((10 + (tt.tt_rn % 8))::text || ' hours')::interval
          + (((tt.tt_rn % 2) * 30)::text || ' minutes')::interval
        ) AS end_time,
        'scheduled',
        REPLACE(tt."description", '-TT-', '-RV-') AS note,
        tt.patient_id,
        tt.appointment_id,
        rr.room_id,
        tt.dentist_id
      FROM tt_rows tt
      INNER JOIN appointment_rows ar ON ar.appointment_id = tt.appointment_id
      INNER JOIN room_count rc ON rc.total > 0
      INNER JOIN room_rows rr ON rr.room_rn = ((tt.tt_rn - 1) % rc.total) + 1
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Randevue" rv
        WHERE rv.note = REPLACE(tt."description", '-TT-', '-RV-')
      )
    `);

    await queryRunner.query(`
      WITH ttt_rows AS (
        SELECT
          ttt.id AS ttt_id,
          tt."description" AS tt_description
        FROM "ToothTreatmentTeeth" ttt
        INNER JOIN "Tooth_Treatment" tt ON tt.id = ttt."tooth_treatment_id"
        WHERE tt."description" LIKE 'CL11-BIGWEEK-TT-%'
           OR tt."description" LIKE 'CL11-BIGWEEK-D13-TT-%'
      ),
      rv_rows AS (
        SELECT
          rv.id AS randevue_id,
          rv.note
        FROM "Randevue" rv
        WHERE rv.note LIKE 'CL11-BIGWEEK-RV-%'
           OR rv.note LIKE 'CL11-BIGWEEK-D13-RV-%'
      )
      INSERT INTO "Treatment_Randevue" ("tooth_treatment_teeth_id", "randevue_id")
      SELECT ttt.ttt_id, rv.randevue_id
      FROM ttt_rows ttt
      INNER JOIN rv_rows rv
        ON rv.note = REPLACE(ttt.tt_description, '-TT-', '-RV-')
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Treatment_Randevue" tr
        WHERE tr."tooth_treatment_teeth_id" = ttt.ttt_id
          AND tr."randevue_id" = rv.randevue_id
      )
    `);
  }

  public async down(): Promise<void> {
    // Intentionally empty. This migration seeds large mock data.
  }
}
