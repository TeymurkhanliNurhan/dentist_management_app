import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Demo nurses for Baku Aile Dental Mərkəzi + working hours (Mon–Sun10:00–18:00)
 * and sample blocking hours next month (idempotent).
 */
export class SeedNursesForBakuClinic1775900000000 implements MigrationInterface {
  name = 'SeedNursesForBakuClinic1775900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
             '$2b$10$axsI.MewyvfFSz2hp3maTuZeMEJlFBbBxznLvYtEGYAENfQFgYqdi',
             true, true, '2025-01-06'::date, clinic_row.clinic_id
      FROM clinic_row
      CROSS JOIN (
        VALUES
          ('Gülnar', 'Rəhimova', '1992-05-08', 'gulnar.rahimova@bakuaile.az'),
          ('Samir', 'Bağırov', '1987-11-19', 'samir.bagirov@bakuaile.az')
      ) AS seed("name", "surname", "birthDate", "gmail")
      WHERE NOT EXISTS (
        SELECT 1 FROM "Staff" s WHERE s."gmail" = seed."gmail"
      )
    `);

    await queryRunner.query(`
      INSERT INTO "Nurse" ("staffId")
      SELECT s.id
      FROM "Staff" s
      INNER JOIN "Clinic" c ON c.id = s."clinicId"
      WHERE c."name" = 'Baku Aile Dental Mərkəzi'
        AND s."gmail" IN (
          'gulnar.rahimova@bakuaile.az',
          'samir.bagirov@bakuaile.az'
        )
        AND NOT EXISTS (
          SELECT 1 FROM "Nurse" n WHERE n."staffId" = s.id
        )
    `);

    await queryRunner.query(`
      WITH target_clinic AS (
        SELECT c.id AS clinic_id
        FROM "Clinic" c
        WHERE c."name" = 'Baku Aile Dental Mərkəzi'
        LIMIT 1
      ),
      nurse_staff AS (
        SELECT n."staffId" AS staff_id
        FROM "Nurse" n
        INNER JOIN "Staff" s ON s.id = n."staffId"
        INNER JOIN target_clinic tc ON tc.clinic_id = s."clinicId"
      )
      INSERT INTO "Working_hours" ("dayOfWeek", "startTime", "endTime", "staff")
      SELECT dow.day_of_week, '10:00:00'::time, '18:00:00'::time, ns.staff_id
      FROM nurse_staff ns
      CROSS JOIN generate_series(1, 7) AS dow(day_of_week)
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Working_hours" wh
        WHERE wh."staff" = ns.staff_id
          AND wh."dayOfWeek" = dow.day_of_week
          AND wh."startTime" = '10:00:00'::time
          AND wh."endTime" = '18:00:00'::time
      )
    `);

    await queryRunner.query(`
      WITH target_clinic AS (
        SELECT c.id AS clinic_id
        FROM "Clinic" c
        WHERE c."name" = 'Baku Aile Dental Mərkəzi'
        LIMIT 1
      ),
      nurse_staff AS (
        SELECT n."staffId" AS staff_id
        FROM "Nurse" n
        INNER JOIN "Staff" s ON s.id = n."staffId"
        INNER JOIN target_clinic tc ON tc.clinic_id = s."clinicId"
      ),
      next_month AS (
        SELECT
          (date_trunc('month', CURRENT_DATE) + interval '1 month')::date AS month_start,
          (date_trunc('month', CURRENT_DATE) + interval '2 month')::date AS month_end
      ),
      days_meta AS (
        SELECT
          nm.month_start,
          EXTRACT(DAY FROM (nm.month_end - interval '1 day'))::int AS days_in_month
        FROM next_month nm
      ),
      generated_blocks AS (
        SELECT
          ns.staff_id,
          (
            dm.month_start
            + (((ns.staff_id * 11 + slot.idx * 7) % dm.days_in_month) * interval '1 day')
            + make_interval(hours => 13 + ((ns.staff_id + slot.idx) % 4))
          )::timestamp AS start_time,
          (
            dm.month_start
            + (((ns.staff_id * 11 + slot.idx * 7) % dm.days_in_month) * interval '1 day')
            + make_interval(hours => 13 + ((ns.staff_id + slot.idx) % 4))
            + interval '30 minutes'
          )::timestamp AS end_time
        FROM nurse_staff ns
        CROSS JOIN days_meta dm
        CROSS JOIN generate_series(0, 2) AS slot(idx)
      )
      INSERT INTO "Blocking_hours" ("startTime", "endTime", "staff", "room")
      SELECT gb.start_time, gb.end_time, gb.staff_id, NULL
      FROM generated_blocks gb
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Blocking_hours" bh
        WHERE bh."staff" = gb.staff_id
          AND bh."room" IS NULL
          AND bh."startTime" = gb.start_time
          AND bh."endTime" = gb.end_time
      )
    `);
  }

  public async down(): Promise<void> {
    // Intentionally empty.
  }
}
