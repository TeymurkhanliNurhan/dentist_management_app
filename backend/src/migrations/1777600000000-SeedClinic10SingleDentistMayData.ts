import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedClinic10SingleDentistMayData1777600000000
  implements MigrationInterface
{
  name = 'SeedClinic10SingleDentistMayData1777600000000';

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
      )
      INSERT INTO "Appointment" (
        "startDate", "endDate", "calculatedFee", "chargedFee", "discountFee", "clinicId", "patient"
      )
      SELECT
        seed.appt_date::date,
        seed.appt_date::date,
        seed.calculated_fee,
        seed.charged_fee,
        seed.discount_fee,
        c.clinic_id,
        p.patient_id
      FROM clinic_row c
      INNER JOIN (
        VALUES
          (1, '2026-05-04', 130, 120, 10),
          (2, '2026-05-05', 160, 150, 10),
          (3, '2026-05-06', 95, 95, 0),
          (4, '2026-05-08', 180, 165, 15),
          (5, '2026-05-10', 210, 190, 20),
          (6, '2026-05-12', 145, 140, 5),
          (7, '2026-05-14', 170, 160, 10),
          (8, '2026-05-17', 220, 200, 20)
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
        SELECT p.id AS patient_id, ROW_NUMBER() OVER (ORDER BY p.id) AS rn
        FROM "Patient" p
        INNER JOIN clinic_row c ON c.clinic_id = p."clinicId"
        ORDER BY p.id
        LIMIT 8
      ),
      appointment_rows AS (
        SELECT
          a.id AS appointment_id,
          a."patient",
          ROW_NUMBER() OVER (PARTITION BY a."patient" ORDER BY a.id) AS appt_rn
        FROM "Appointment" a
        INNER JOIN clinic_row c ON c.clinic_id = a."clinicId"
        WHERE a."startDate" BETWEEN '2026-05-04'::date AND '2026-05-17'::date
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
        seed.fee_snapshot,
        seed.description
      FROM (
        VALUES
          (1, 1, 1, 110, 'CL10-MAY-TT-1'),
          (2, 1, 2, 140, 'CL10-MAY-TT-2'),
          (3, 1, 3, 85,  'CL10-MAY-TT-3'),
          (4, 1, 4, 160, 'CL10-MAY-TT-4'),
          (5, 1, 5, 175, 'CL10-MAY-TT-5'),
          (6, 1, 6, 130, 'CL10-MAY-TT-6'),
          (7, 1, 2, 120, 'CL10-MAY-TT-7'),
          (8, 1, 3, 170, 'CL10-MAY-TT-8')
      ) AS seed(patient_rn, tooth_rn, treatment_rn, fee_snapshot, description)
      INNER JOIN patient_rows p ON p.rn = seed.patient_rn
      INNER JOIN appointment_rows a ON a."patient" = p.patient_id AND a.appt_rn = 1
      INNER JOIN patient_teeth pt ON pt.patient = p.patient_id AND pt.tooth_rn = seed.tooth_rn
      INNER JOIN treatment_rows tr ON tr.rn = seed.treatment_rn
      CROSS JOIN dentist_row d
      WHERE d.dentist_id IS NOT NULL
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
        WHERE description LIKE 'CL10-MAY-TT-%'
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
        WHERE tt.description LIKE 'CL10-MAY-TT-%'
      )
      INSERT INTO "Randevue" (
        "date", "endTime", "status", "note", "patient", "appointment", "room", "dentist"
      )
      SELECT
        seed.start_time::timestamp,
        seed.end_time::timestamp,
        'scheduled',
        seed.note,
        tt.patient,
        tt."appointment",
        rr.room_id,
        dr.dentist_id
      FROM (
        VALUES
          (1, '2026-05-04 09:00:00', '2026-05-04 09:35:00', 'CL10-MAY-RV-1'),
          (2, '2026-05-05 09:50:00', '2026-05-05 10:30:00', 'CL10-MAY-RV-2'),
          (3, '2026-05-06 10:10:00', '2026-05-06 10:35:00', 'CL10-MAY-RV-3'),
          (4, '2026-05-08 11:00:00', '2026-05-08 11:40:00', 'CL10-MAY-RV-4'),
          (5, '2026-05-10 12:20:00', '2026-05-10 13:00:00', 'CL10-MAY-RV-5'),
          (6, '2026-05-12 13:40:00', '2026-05-12 14:15:00', 'CL10-MAY-RV-6'),
          (7, '2026-05-14 14:30:00', '2026-05-14 15:05:00', 'CL10-MAY-RV-7'),
          (8, '2026-05-17 15:20:00', '2026-05-17 16:00:00', 'CL10-MAY-RV-8')
      ) AS seed(tt_rn, start_time, end_time, note)
      INNER JOIN tt_rows tt ON tt.rn = seed.tt_rn
      CROSS JOIN room_row rr
      CROSS JOIN dentist_row dr
      WHERE rr.room_id IS NOT NULL
        AND dr.dentist_id IS NOT NULL
        AND NOT EXISTS (
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
        WHERE tt.description LIKE 'CL10-MAY-TT-%'
      ),
      rv_rows AS (
        SELECT rv.id AS randevue_id, rv.note
        FROM "Randevue" rv
        WHERE rv.note LIKE 'CL10-MAY-RV-%'
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
