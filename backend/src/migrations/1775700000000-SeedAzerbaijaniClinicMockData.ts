import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAzerbaijaniClinicMockData1775700000000
  implements MigrationInterface
{
  name = 'SeedAzerbaijaniClinicMockData1775700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "Clinic" ("name", "address")
      SELECT 'Baku Aile Dental Mərkəzi', 'Bakı ş., Nizami rayonu, Qara Qarayev prospekti 101'
      WHERE NOT EXISTS (
        SELECT 1 FROM "Clinic" WHERE "name" = 'Baku Aile Dental Mərkəzi'
      )
    `);

    await queryRunner.query(`
      WITH clinic_row AS (
        SELECT id AS clinic_id
        FROM "Clinic"
        WHERE "name" = 'Baku Aile Dental Mərkəzi'
        LIMIT 1
      )
      INSERT INTO "Staff" (
        "name", "surname", "birthDate", "gmail", "password",
        "isEmailVerified", "active", "startDate", "clinicId"
      )
      SELECT seed."name", seed."surname", seed."birthDate"::date, seed."gmail",
             '$2b$10$Y8fQe1jM4x0K9C9D3vHf5e6T2Y7pWQjz9vKq2Yl8iR3eN0aM7tY2a',
             true, true, '2025-01-06'::date, clinic_row.clinic_id
      FROM clinic_row
      CROSS JOIN (
        VALUES
          ('Elvin', 'Məmmədov', '1988-04-14', 'elvin.mammadov@bakuaile.az'),
          ('Aysel', 'Həsənova', '1991-09-03', 'aysel.hasanova@bakuaile.az'),
          ('Rəşad', 'Əliyev', '1986-12-21', 'rashad.aliyev@bakuaile.az'),
          ('Nigar', 'Quliyeva', '1983-02-18', 'nigar.quliyeva@bakuaile.az'),
          ('Leyla', 'Səfərova', '1994-07-29', 'leyla.saferova@bakuaile.az')
      ) AS seed("name", "surname", "birthDate", "gmail")
      WHERE NOT EXISTS (
        SELECT 1 FROM "Staff" s WHERE s."gmail" = seed."gmail"
      )
    `);

    await queryRunner.query(`
      INSERT INTO "Dentist" ("staffId")
      SELECT s.id
      FROM "Staff" s
      INNER JOIN "Clinic" c ON c.id = s."clinicId"
      WHERE c."name" = 'Baku Aile Dental Mərkəzi'
        AND s."gmail" IN (
          'elvin.mammadov@bakuaile.az',
          'aysel.hasanova@bakuaile.az',
          'rashad.aliyev@bakuaile.az'
        )
        AND NOT EXISTS (
          SELECT 1 FROM "Dentist" d WHERE d."staffId" = s.id
        )
    `);

    await queryRunner.query(`
      INSERT INTO "Director" ("staffId")
      SELECT s.id
      FROM "Staff" s
      INNER JOIN "Clinic" c ON c.id = s."clinicId"
      WHERE c."name" = 'Baku Aile Dental Mərkəzi'
        AND s."gmail" = 'nigar.quliyeva@bakuaile.az'
        AND NOT EXISTS (
          SELECT 1 FROM "Director" d WHERE d."staffId" = s.id
        )
    `);

    await queryRunner.query(`
      INSERT INTO "FrontDeskWorker" ("staffId")
      SELECT s.id
      FROM "Staff" s
      INNER JOIN "Clinic" c ON c.id = s."clinicId"
      WHERE c."name" = 'Baku Aile Dental Mərkəzi'
        AND s."gmail" = 'leyla.saferova@bakuaile.az'
        AND NOT EXISTS (
          SELECT 1 FROM "FrontDeskWorker" f WHERE f."staffId" = s.id
        )
    `);

    await queryRunner.query(`
      WITH clinic_row AS (
        SELECT id AS clinic_id
        FROM "Clinic"
        WHERE "name" = 'Baku Aile Dental Mərkəzi'
        LIMIT 1
      ),
      dentist_rows AS (
        SELECT d.id AS dentist_id, s."gmail"
        FROM "Dentist" d
        INNER JOIN "Staff" s ON s.id = d."staffId"
        INNER JOIN clinic_row c ON c.clinic_id = s."clinicId"
      )
      INSERT INTO "Room" ("number", "description", "clinicId", "dentistId")
      SELECT seed."number", seed."description", c.clinic_id, d.dentist_id
      FROM clinic_row c
      INNER JOIN (
        VALUES
          ('101', 'Müayinə və ilkin konsultasiya otağı', 'elvin.mammadov@bakuaile.az'),
          ('102', 'Endodontiya və kanal müalicəsi otağı', 'aysel.hasanova@bakuaile.az'),
          ('103', 'Cərrahi və implant planlama otağı', 'rashad.aliyev@bakuaile.az')
      ) AS seed("number", "description", "gmail") ON true
      INNER JOIN dentist_rows d ON d."gmail" = seed."gmail"
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Room" r
        WHERE r."clinicId" = c.clinic_id
          AND r."number" = seed."number"
      )
    `);

    await queryRunner.query(`
      WITH clinic_row AS (
        SELECT id AS clinic_id
        FROM "Clinic"
        WHERE "name" = 'Baku Aile Dental Mərkəzi'
        LIMIT 1
      )
      INSERT INTO "Treatment" ("name", "price", "description", "pricePer", "clinicId")
      SELECT seed."name", seed."price", seed."description", seed."pricePer", c.clinic_id
      FROM clinic_row c
      CROSS JOIN (
        VALUES
          ('Konsultasiya', 20, 'Ağız boşluğunun ümumi yoxlanışı və diaqnostik plan', 'mouth'),
          ('Diş daşı təmizlənməsi', 60, 'Ultrasəs vasitəsilə diş daşı və ləkələrin təmizlənməsi', 'mouth'),
          ('Karies dolğusu', 85, 'Kompozit materialla estetik dolğu qoyulması', 'tooth'),
          ('Kanal müalicəsi', 170, 'Pulpanın təmizlənməsi və kanal doldurulması', 'tooth'),
          ('Diş çəkimi', 95, 'Problemli dişin travmasız çıxarılması', 'tooth'),
          ('Keramik tac', 260, 'Dişin üzərinə tam örtücü keramik bərpa', 'tooth'),
          ('İmplant konsultasiyası', 40, 'İmplant üçün kliniki və rentgen qiymətləndirmə', 'mouth'),
          ('Ağartma proseduru', 190, 'Klinik şəraitdə peşəkar diş ağartma seansı', 'mouth')
      ) AS seed("name", "price", "description", "pricePer")
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Treatment" t
        WHERE t."clinicId" = c.clinic_id
          AND t."name" = seed."name"
      )
    `);

    await queryRunner.query(`
      WITH clinic_row AS (
        SELECT id AS clinic_id
        FROM "Clinic"
        WHERE "name" = 'Baku Aile Dental Mərkəzi'
        LIMIT 1
      ),
      dentist_rows AS (
        SELECT d.id AS dentist_id, s."gmail"
        FROM "Dentist" d
        INNER JOIN "Staff" s ON s.id = d."staffId"
        INNER JOIN clinic_row c ON c.clinic_id = s."clinicId"
      ),
      treatment_rows AS (
        SELECT t.id AS treatment_id, t."name"
        FROM "Treatment" t
        INNER JOIN clinic_row c ON c.clinic_id = t."clinicId"
      )
      INSERT INTO "Dentist_Treatment" ("Treatment", "Dentist")
      SELECT tr.treatment_id, dr.dentist_id
      FROM (
        VALUES
          ('elvin.mammadov@bakuaile.az', 'Konsultasiya'),
          ('elvin.mammadov@bakuaile.az', 'Diş daşı təmizlənməsi'),
          ('elvin.mammadov@bakuaile.az', 'Karies dolğusu'),
          ('aysel.hasanova@bakuaile.az', 'Kanal müalicəsi'),
          ('aysel.hasanova@bakuaile.az', 'Keramik tac'),
          ('aysel.hasanova@bakuaile.az', 'Ağartma proseduru'),
          ('rashad.aliyev@bakuaile.az', 'Diş çəkimi'),
          ('rashad.aliyev@bakuaile.az', 'İmplant konsultasiyası'),
          ('rashad.aliyev@bakuaile.az', 'Konsultasiya')
      ) AS seed(gmail, treatment_name)
      INNER JOIN dentist_rows dr ON dr."gmail" = seed.gmail
      INNER JOIN treatment_rows tr ON tr."name" = seed.treatment_name
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
        WHERE "name" = 'Baku Aile Dental Mərkəzi'
        LIMIT 1
      )
      INSERT INTO "Patient" ("name", "surname", "birthDate", "clinicId")
      SELECT seed."name", seed."surname", seed."birthDate"::date, c.clinic_id
      FROM clinic_row c
      CROSS JOIN (
        VALUES
          ('Murad', 'Nəbizadə', '1997-06-11'),
          ('Aytac', 'Kərimova', '2001-01-26'),
          ('Tural', 'Rzayev', '1989-10-09'),
          ('Səbinə', 'Cəfərova', '1993-03-17'),
          ('Orxan', 'İsmayılov', '1985-08-24'),
          ('Günel', 'Tağıyeva', '1999-12-02')
      ) AS seed("name", "surname", "birthDate")
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Patient" p
        WHERE p."clinicId" = c.clinic_id
          AND p."name" = seed."name"
          AND p."surname" = seed."surname"
          AND p."birthDate" = seed."birthDate"::date
      )
    `);

    await queryRunner.query(`
      WITH clinic_row AS (
        SELECT id AS clinic_id
        FROM "Clinic"
        WHERE "name" = 'Baku Aile Dental Mərkəzi'
        LIMIT 1
      ),
      patient_rows AS (
        SELECT p.id, p."name", p."surname"
        FROM "Patient" p
        INNER JOIN clinic_row c ON c.clinic_id = p."clinicId"
      )
      INSERT INTO "Appointment" (
        "startDate", "endDate", "calculatedFee", "chargedFee", "discountFee", "clinicId", "patient"
      )
      SELECT seed."startDate"::date, seed."endDate"::date, seed."calculatedFee",
             seed."chargedFee", seed."discountFee", c.clinic_id, p.id
      FROM clinic_row c
      INNER JOIN (
        VALUES
          ('Murad', 'Nəbizadə', '2026-04-20', '2026-04-20', 255, 240, 15),
          ('Aytac', 'Kərimova', '2026-04-22', '2026-04-22', 340, 330, 10),
          ('Tural', 'Rzayev', '2026-04-24', '2026-04-24', 275, 275, 0),
          ('Səbinə', 'Cəfərova', '2026-04-27', '2026-04-27', 370, 350, 20)
      ) AS seed("name", "surname", "startDate", "endDate", "calculatedFee", "chargedFee", "discountFee")
        ON true
      INNER JOIN patient_rows p
        ON p."name" = seed."name" AND p."surname" = seed."surname"
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Appointment" a
        WHERE a."clinicId" = c.clinic_id
          AND a."patient" = p.id
          AND a."startDate" = seed."startDate"::date
      )
    `);

    await queryRunner.query(`
      WITH clinic_row AS (
        SELECT id AS clinic_id
        FROM "Clinic"
        WHERE "name" = 'Baku Aile Dental Mərkəzi'
        LIMIT 1
      ),
      patient_rows AS (
        SELECT p.id AS patient_id, p."name", p."surname"
        FROM "Patient" p
        INNER JOIN clinic_row c ON c.clinic_id = p."clinicId"
      ),
      appointment_rows AS (
        SELECT a.id AS appointment_id, a."patient", a."startDate"
        FROM "Appointment" a
        INNER JOIN clinic_row c ON c.clinic_id = a."clinicId"
      ),
      dentist_rows AS (
        SELECT d.id AS dentist_id, s."gmail"
        FROM "Dentist" d
        INNER JOIN "Staff" s ON s.id = d."staffId"
        INNER JOIN clinic_row c ON c.clinic_id = s."clinicId"
      ),
      treatment_rows AS (
        SELECT t.id AS treatment_id, t."name"
        FROM "Treatment" t
        INNER JOIN clinic_row c ON c.clinic_id = t."clinicId"
      )
      INSERT INTO "Tooth_Treatment" (
        "patient", "tooth", "appointment", "treatment", "dentist", "feeSnapshot", "description"
      )
      SELECT p.patient_id, seed.tooth_id, a.appointment_id, tr.treatment_id, d.dentist_id,
             seed.fee_snapshot, seed.description
      FROM (
        VALUES
          ('Murad', 'Nəbizadə', '2026-04-20', 16, 'Konsultasiya', 'elvin.mammadov@bakuaile.az', 20,  'AZ-MOCK-A1-T1 ümumi baxış'),
          ('Murad', 'Nəbizadə', '2026-04-20', 16, 'Karies dolğusu', 'elvin.mammadov@bakuaile.az', 85, 'AZ-MOCK-A1-T2 dolğu 16'),
          ('Murad', 'Nəbizadə', '2026-04-20', 17, 'Diş daşı təmizlənməsi', 'elvin.mammadov@bakuaile.az', 150, 'AZ-MOCK-A1-T3 gigiyena'),
          ('Aytac', 'Kərimova', '2026-04-22', 26, 'Kanal müalicəsi', 'aysel.hasanova@bakuaile.az', 170, 'AZ-MOCK-A2-T1 kanal 26'),
          ('Aytac', 'Kərimova', '2026-04-22', 26, 'Keramik tac', 'aysel.hasanova@bakuaile.az', 260, 'AZ-MOCK-A2-T2 tac 26'),
          ('Aytac', 'Kərimova', '2026-04-22', 11, 'Konsultasiya', 'elvin.mammadov@bakuaile.az', 20, 'AZ-MOCK-A2-T3 plan'),
          ('Tural', 'Rzayev', '2026-04-24', 38, 'Diş çəkimi', 'rashad.aliyev@bakuaile.az', 95, 'AZ-MOCK-A3-T1 çəkim 38'),
          ('Tural', 'Rzayev', '2026-04-24', 37, 'İmplant konsultasiyası', 'rashad.aliyev@bakuaile.az', 40, 'AZ-MOCK-A3-T2 implant plan'),
          ('Tural', 'Rzayev', '2026-04-24', 47, 'Karies dolğusu', 'elvin.mammadov@bakuaile.az', 85, 'AZ-MOCK-A3-T3 dolğu 47'),
          ('Səbinə', 'Cəfərova', '2026-04-27', 21, 'Ağartma proseduru', 'aysel.hasanova@bakuaile.az', 190, 'AZ-MOCK-A4-T1 ağartma'),
          ('Səbinə', 'Cəfərova', '2026-04-27', 22, 'Karies dolğusu', 'elvin.mammadov@bakuaile.az', 85, 'AZ-MOCK-A4-T2 dolğu 22'),
          ('Səbinə', 'Cəfərova', '2026-04-27', 24, 'Konsultasiya', 'rashad.aliyev@bakuaile.az', 20, 'AZ-MOCK-A4-T3 yekun plan')
      ) AS seed(patient_name, patient_surname, appointment_date, tooth_id, treatment_name, dentist_gmail, fee_snapshot, description)
      INNER JOIN patient_rows p
        ON p."name" = seed.patient_name AND p."surname" = seed.patient_surname
      INNER JOIN appointment_rows a
        ON a."patient" = p.patient_id AND a."startDate" = seed.appointment_date::date
      INNER JOIN treatment_rows tr ON tr."name" = seed.treatment_name
      INNER JOIN dentist_rows d ON d."gmail" = seed.dentist_gmail
      WHERE NOT EXISTS (
        SELECT 1 FROM "Tooth_Treatment" tt WHERE tt."description" = seed.description
      )
    `);

    await queryRunner.query(`
      WITH clinic_row AS (
        SELECT id AS clinic_id
        FROM "Clinic"
        WHERE "name" = 'Baku Aile Dental Mərkəzi'
        LIMIT 1
      ),
      patient_rows AS (
        SELECT p.id AS patient_id, p."name", p."surname"
        FROM "Patient" p
        INNER JOIN clinic_row c ON c.clinic_id = p."clinicId"
      ),
      appointment_rows AS (
        SELECT a.id AS appointment_id, a."patient", a."startDate"
        FROM "Appointment" a
        INNER JOIN clinic_row c ON c.clinic_id = a."clinicId"
      ),
      room_rows AS (
        SELECT r.id AS room_id, r."number"
        FROM "Room" r
        INNER JOIN clinic_row c ON c.clinic_id = r."clinicId"
      ),
      dentist_rows AS (
        SELECT d.id AS dentist_id, s."gmail"
        FROM "Dentist" d
        INNER JOIN "Staff" s ON s.id = d."staffId"
        INNER JOIN clinic_row c ON c.clinic_id = s."clinicId"
      )
      INSERT INTO "Randevue" (
        "date", "endTime", "status", "note", "patient", "appointment", "room", "dentist"
      )
      SELECT seed.start_time::timestamp, seed.end_time::timestamp, seed.status, seed.note,
             p.patient_id, a.appointment_id, r.room_id, d.dentist_id
      FROM (
        VALUES
          ('Murad', 'Nəbizadə', '2026-04-20', '2026-04-20 09:30:00', '2026-04-20 10:15:00', 'scheduled', 'İlk qəbul və təmizləmə', '101', 'elvin.mammadov@bakuaile.az'),
          ('Aytac', 'Kərimova', '2026-04-22', '2026-04-22 11:00:00', '2026-04-22 12:00:00', 'scheduled', 'Kanal müalicəsi mərhələ 1', '102', 'aysel.hasanova@bakuaile.az')
      ) AS seed(patient_name, patient_surname, appointment_date, start_time, end_time, status, note, room_number, dentist_gmail)
      INNER JOIN patient_rows p
        ON p."name" = seed.patient_name AND p."surname" = seed.patient_surname
      INNER JOIN appointment_rows a
        ON a."patient" = p.patient_id AND a."startDate" = seed.appointment_date::date
      INNER JOIN room_rows r ON r."number" = seed.room_number
      INNER JOIN dentist_rows d ON d."gmail" = seed.dentist_gmail
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Randevue" rv
        WHERE rv."appointment" = a.appointment_id
          AND rv."date" = seed.start_time::timestamp
      )
    `);

    await queryRunner.query(`
      WITH tt_rows AS (
        SELECT id, patient, tooth, description
        FROM "Tooth_Treatment"
        WHERE description LIKE 'AZ-MOCK-%'
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
  }

  public async down(): Promise<void> {
    // Intentionally empty. This migration seeds mock data.
  }
}
