import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppointmentFeeColumns1760000000000 implements MigrationInterface {
    name = 'AddAppointmentFeeColumns1760000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "calculatedFee" double precision NOT NULL DEFAULT 0');
        await queryRunner.query('ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "chargedFee" double precision NULL');
        await queryRunner.query('ALTER TABLE "Appointment" ALTER COLUMN "discountFee" TYPE double precision USING "discountFee"::double precision');

        await queryRunner.query('ALTER TABLE "Tooth_Treatment" ADD COLUMN IF NOT EXISTS "feeSnapshot" double precision NOT NULL DEFAULT 0');
        await queryRunner.query('ALTER TABLE "Tooth_Treatment_Medicine" ADD COLUMN IF NOT EXISTS "medicinePriceSnapshot" double precision NOT NULL DEFAULT 0');

        await queryRunner.query(`
            UPDATE "Tooth_Treatment" tt
            SET "feeSnapshot" = COALESCE(t.price, 0)
            FROM "Treatment" t
            WHERE t.id = tt.treatment
        `);

        await queryRunner.query(`
            UPDATE "Tooth_Treatment_Medicine" ttm
            SET "medicinePriceSnapshot" = COALESCE(m.price, 0)
            FROM "Medicine" m
            WHERE m.id = ttm."Medicine"
        `);

        await queryRunner.query(`
            WITH medicine_totals AS (
                SELECT ttm."Tooth_Treatment" AS tooth_treatment_id,
                       SUM(COALESCE(ttm."medicinePriceSnapshot", 0)) AS medicine_total
                FROM "Tooth_Treatment_Medicine" ttm
                GROUP BY ttm."Tooth_Treatment"
            ),
            appointment_totals AS (
                SELECT a.id AS appointment_id,
                       COALESCE(SUM(COALESCE(tt."feeSnapshot", 0) + COALESCE(mt.medicine_total, 0)), 0) AS calculated_total
                FROM "Appointment" a
                LEFT JOIN "Tooth_Treatment" tt ON tt.appointment = a.id
                LEFT JOIN medicine_totals mt ON mt.tooth_treatment_id = tt.id
                GROUP BY a.id
            )
            UPDATE "Appointment" a
            SET "calculatedFee" = at.calculated_total,
                "discountFee" = CASE
                    WHEN a."chargedFee" IS NULL THEN NULL
                    ELSE at.calculated_total - a."chargedFee"
                END
            FROM appointment_totals at
            WHERE at.appointment_id = a.id
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "Appointment" ALTER COLUMN "discountFee" TYPE int USING ROUND("discountFee")::int');
        await queryRunner.query('ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "chargedFee"');
        await queryRunner.query('ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "calculatedFee"');

        await queryRunner.query('ALTER TABLE "Tooth_Treatment_Medicine" DROP COLUMN IF EXISTS "medicinePriceSnapshot"');
        await queryRunner.query('ALTER TABLE "Tooth_Treatment" DROP COLUMN IF EXISTS "feeSnapshot"');
    }
}

