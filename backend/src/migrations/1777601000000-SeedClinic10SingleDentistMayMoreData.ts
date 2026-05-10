import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedClinic10SingleDentistMayMoreData1777601000000
  implements MigrationInterface
{
  name = 'SeedClinic10SingleDentistMayMoreData1777601000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH clinic_row AS (
        SELECT id AS clinic_id
        FROM "Clinic"
        WHERE id = 10
        LIMIT 1
      ),
      patient_rows AS (
        SELECT
          p.id AS patient_id,
          ROW_NUMBER() OVER (ORDER BY p.id) AS rn
        FROM "Patient" p
        INNER JOIN clinic_row c ON c.clinic_id = p."clinicId"
        ORDER BY p.id
        LIMIT 8
      ),
      day_rows AS (
        SELECT * FROM (
          VALUES
            (1, '2026-05-04'::date, 1),
            (2, '2026-05-08'::date, 2),
            (3, '2026-05-12'::date, 3)
        ) AS d(day_rn, appt_date, fee_scale)
      )
      INSERT INTO "Appointment" (
        "startDate", "endDate", "calculatedFee", "chargedFee", "discountFee", "clinicId", "patient"
      )
      SELECT
        d.appt_date,
        d.appt_date,
        (95 + (p.rn * 8) + (d.fee_scale * 12))::double precision AS calculated_fee,
        (88 + (p.rn * 8) + (d.fee_scale * 10))::double precision AS charged_fee,
        (7 + d.fee_scale)::double precision AS discount_fee,
        c.clinic_id,
        p.patient_id
      FROM clinic_row c
      INNER JOIN patient_rows p ON true
      INNER JOIN day_rows d ON true
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
        WHERE id = 10
        LIMIT 1
      ),
      dentist_row AS (
        SELECT d.id AS dentist_id
        FROM "Dentist" d
        INNER JOIN "Staff" s ON s.id = d."staffId"
        INNER JOIN clinic_row c ON c.clinic_id = s."clinicId"
        WHERE s.id = 10
        LIMIT 1
      ),
      treatment_rows AS (
        SELECT t.id AS treatment_id, ROW_NUMBER() OVER (ORDER BY t.id) AS rn
        FROM "Treatment" t
        INNER JOIN clinic_row c ON c.clinic_id = t."clinicId"
        ORDER BY t.id
        LIMIT 6
      ),
      patient_rows AS (
        SELECT p.id AS patient_id, ROW_NUMBER() OVER (ORDER BY p.id) AS patient_rn
        FROM "Patient" p
        INNER JOIN clinic_row c ON c.clinic_id = p."clinicId"
        ORDER BY p.id
        LIMIT 8
      ),
      appointments_ranked AS (
        SELECT
          a.id AS appointment_id,
          a."patient",
          ROW_NUMBER() OVER (PARTITION BY a."patient" ORDER BY a."startDate", a.id) AS appt_rn
        FROM "Appointment" a
        INNER JOIN clinic_row c ON c.clinic_id = a."clinicId"
        WHERE a."startDate" IN ('2026-05-04'::date, '2026-05-08'::date, '2026-05-12'::date)
      ),
      patient_teeth AS (
        SELECT
          pt.patient,
          pt.tooth,
          ROW_NUMBER() OVER (PARTITION BY pt.patient ORDER BY pt.tooth) AS tooth_rn
        FROM "Patient_Teeth" pt
        INNER JOIN patient_rows p ON p.patient_id = pt.patient
      )
      INSERT INTO "Tooth_Treatment" (
        "patient", "tooth", "appointment", "treatment", "dentist", "feeSnapshot", "description"
      )
      SELECT
        p.patient_id,
        pt.tooth,
        a.appointment_id,
        tr.treatment_id,
        d.dentist_id,
        (90 + (p.patient_rn * 7) + (a.appt_rn * 10))::double precision AS fee_snapshot,
        ('CL10-MAYX-TT-' || (((p.patient_rn - 1) * 3) + a.appt_rn))::varchar
      FROM patient_rows p
      INNER JOIN appointments_ranked a
        ON a."patient" = p.patient_id
       AND a.appt_rn BETWEEN 1 AND 3
      INNER JOIN patient_teeth pt
        ON pt.patient = p.patient_id
       AND pt.tooth_rn = a.appt_rn
      INNER JOIN treatment_rows tr
        ON tr.rn = ((p.patient_rn + a.appt_rn - 2) % 6) + 1
      CROSS JOIN dentist_row d
      WHERE d.dentist_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "Tooth_Treatment" tt
          WHERE tt."description" = ('CL10-MAYX-TT-' || (((p.patient_rn - 1) * 3) + a.appt_rn))
        )
    `);

    await queryRunner.query(`
      WITH tt_rows AS (
        SELECT id, patient, tooth
        FROM "Tooth_Treatment"
        WHERE description LIKE 'CL10-MAYX-TT-%'
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
        WHERE id = 10
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
        WHERE s.id = 10
        LIMIT 1
      ),
      tt_rows AS (
        SELECT
          tt.id AS tooth_treatment_id,
          tt."appointment",
          tt.patient,
          tt.description,
          ROW_NUMBER() OVER (ORDER BY tt.id) AS rn
        FROM "Tooth_Treatment" tt
        WHERE tt.description LIKE 'CL10-MAYX-TT-%'
      )
      INSERT INTO "Randevue" (
        "date", "endTime", "status", "note", "patient", "appointment", "room", "dentist"
      )
      SELECT
        ('2026-05-04 08:40:00'::timestamp + (((tt.rn - 1) * 35) || ' minutes')::interval),
        ('2026-05-04 09:10:00'::timestamp + (((tt.rn - 1) * 35) || ' minutes')::interval),
        'scheduled',
        ('CL10-MAYX-RV-' || tt.rn),
        tt.patient,
        tt."appointment",
        rr.room_id,
        dr.dentist_id
      FROM tt_rows tt
      CROSS JOIN room_row rr
      CROSS JOIN dentist_row dr
      WHERE rr.room_id IS NOT NULL
        AND dr.dentist_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "Randevue" rv
          WHERE rv.note = ('CL10-MAYX-RV-' || tt.rn)
        )
    `);

    await queryRunner.query(`
      WITH ttt_rows AS (
        SELECT
          ttt.id AS ttt_id,
          tt.description
        FROM "ToothTreatmentTeeth" ttt
        INNER JOIN "Tooth_Treatment" tt ON tt.id = ttt."tooth_treatment_id"
        WHERE tt.description LIKE 'CL10-MAYX-TT-%'
      ),
      rv_rows AS (
        SELECT
          rv.id AS randevue_id,
          rv.note
        FROM "Randevue" rv
        WHERE rv.note LIKE 'CL10-MAYX-RV-%'
      )
      INSERT INTO "Treatment_Randevue" ("tooth_treatment_teeth_id", "randevue_id")
      SELECT map.ttt_id, map.randevue_id
      FROM (
        SELECT
          ttt.ttt_id,
          rv.randevue_id
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
