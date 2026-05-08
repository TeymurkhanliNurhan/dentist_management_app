import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMedicineExpenseAndLinkPurchasePaymentDetails1776800000000
  implements MigrationInterface
{
  name = 'SeedMedicineExpenseAndLinkPurchasePaymentDetails1776800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "Expense" ("clinicId", "name", "description", "fixedCost", "dayOfMonth")
      SELECT c.id, 'Medicine', NULL, NULL, NULL
      FROM "Clinic" c
      WHERE NOT EXISTS (
        SELECT 1
        FROM "Expense" e
        WHERE e."clinicId" = c.id
          AND e."name" = 'Medicine'
      )
    `);

    await queryRunner.query(`
      WITH payment_detail_clinic AS (
        SELECT
          pm."paymentDetailsId" AS "paymentDetailsId",
          MIN(m."clinicId") AS "clinicId"
        FROM "Purchase_Medicine" pm
        INNER JOIN "Medicine" m ON m.id = pm."medicineId"
        GROUP BY pm."paymentDetailsId"
      ),
      medicine_expense_per_clinic AS (
        SELECT
          e."clinicId" AS "clinicId",
          MIN(e.id) AS "expenseId"
        FROM "Expense" e
        WHERE e."name" = 'Medicine'
        GROUP BY e."clinicId"
      )
      UPDATE "PaymentDetails" pd
      SET "expenseId" = mepc."expenseId"
      FROM payment_detail_clinic pdc
      INNER JOIN medicine_expense_per_clinic mepc
        ON mepc."clinicId" = pdc."clinicId"
      WHERE pd.id = pdc."paymentDetailsId"
    `);
  }

  public async down(): Promise<void> {
    // Intentionally left empty to avoid destructive rollback of business mappings.
  }
}
