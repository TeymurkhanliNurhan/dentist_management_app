import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedWorkingAndBlockingHoursForClinicStaff1775800000000
  implements MigrationInterface
{
  name = 'SeedWorkingAndBlockingHoursForClinicStaff1775800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH target_clinic AS (
        SELECT c.id AS clinic_id
        FROM "Clinic" c
        WHERE c."name" = 'Baku Aile Dental Mərkəzi'
        LIMIT 1
      ),
      role_staff AS (
        SELECT d."staffId" AS staff_id
        FROM "Dentist" d
        INNER JOIN "Staff" s ON s.id = d."staffId"
        INNER JOIN target_clinic tc ON tc.clinic_id = s."clinicId"
        UNION
        SELECT n."staffId" AS staff_id
        FROM "Nurse" n
        INNER JOIN "Staff" s ON s.id = n."staffId"
        INNER JOIN target_clinic tc ON tc.clinic_id = s."clinicId"
        UNION
        SELECT f."staffId" AS staff_id
        FROM "FrontDeskWorker" f
        INNER JOIN "Staff" s ON s.id = f."staffId"
        INNER JOIN target_clinic tc ON tc.clinic_id = s."clinicId"
      )
      INSERT INTO "Working_hours" ("dayOfWeek", "startTime", "endTime", "staff")
      SELECT dow.day_of_week, '10:00:00'::time, '18:00:00'::time, rs.staff_id
      FROM role_staff rs
      CROSS JOIN generate_series(1, 7) AS dow(day_of_week)
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Working_hours" wh
        WHERE wh."staff" = rs.staff_id
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
      role_staff AS (
        SELECT d."staffId" AS staff_id
        FROM "Dentist" d
        INNER JOIN "Staff" s ON s.id = d."staffId"
        INNER JOIN target_clinic tc ON tc.clinic_id = s."clinicId"
        UNION
        SELECT n."staffId" AS staff_id
        FROM "Nurse" n
        INNER JOIN "Staff" s ON s.id = n."staffId"
        INNER JOIN target_clinic tc ON tc.clinic_id = s."clinicId"
        UNION
        SELECT f."staffId" AS staff_id
        FROM "FrontDeskWorker" f
        INNER JOIN "Staff" s ON s.id = f."staffId"
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
          nm.month_end,
          EXTRACT(DAY FROM (nm.month_end - interval '1 day'))::int AS days_in_month
        FROM next_month nm
      ),
      generated_blocks AS (
        SELECT
          rs.staff_id,
          (
            dm.month_start
            + (((rs.staff_id * 7 + slot.idx * 5) % dm.days_in_month) * interval '1 day')
            + make_interval(hours => 11 + ((rs.staff_id + slot.idx) % 5))
            + make_interval(mins => CASE WHEN ((rs.staff_id + slot.idx) % 2) = 0 THEN 0 ELSE 30 END)
          )::timestamp AS start_time,
          (
            dm.month_start
            + (((rs.staff_id * 7 + slot.idx * 5) % dm.days_in_month) * interval '1 day')
            + make_interval(hours => 11 + ((rs.staff_id + slot.idx) % 5))
            + make_interval(mins => CASE WHEN ((rs.staff_id + slot.idx) % 2) = 0 THEN 0 ELSE 30 END)
            + interval '45 minutes'
          )::timestamp AS end_time
        FROM role_staff rs
        CROSS JOIN days_meta dm
        CROSS JOIN generate_series(0, 3) AS slot(idx)
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
    // Intentionally empty. This migration seeds schedule data.
  }
}
