import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuantityToToothTreatmentMedicine1760000000001 implements MigrationInterface {
    name = 'AddQuantityToToothTreatmentMedicine1760000000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "Tooth_Treatment_Medicine" ADD COLUMN IF NOT EXISTS "quantity" int NOT NULL DEFAULT 1');
        await queryRunner.query('UPDATE "Tooth_Treatment_Medicine" SET "quantity" = 1 WHERE "quantity" IS NULL');

        await queryRunner.query(`
            WITH medicine_totals AS (
                SELECT ttm."Tooth_Treatment" AS tooth_treatment_id,
                       SUM(COALESCE(ttm."medicinePriceSnapshot", 0) * COALESCE(ttm."quantity", 1)) AS medicine_total
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
        await queryRunner.query('ALTER TABLE "Tooth_Treatment_Medicine" DROP COLUMN IF EXISTS "quantity"');
    }
}

