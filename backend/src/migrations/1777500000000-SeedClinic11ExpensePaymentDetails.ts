import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedClinic11ExpensePaymentDetails1777500000000
  implements MigrationInterface
{
  name = 'SeedClinic11ExpensePaymentDetails1777500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "PaymentDetails" ("expenseId", "date", "salaryId", "cost")
      SELECT
        e.id,
        DATE '2026-05-01',
        NULL,
        (150 + (ROW_NUMBER() OVER (ORDER BY e.id) * 25))::double precision
      FROM "Expense" e
      WHERE e."clinicId" = 11
        AND NOT EXISTS (
          SELECT 1
          FROM "PaymentDetails" pd
          WHERE pd."expenseId" = e.id
            AND pd."salaryId" IS NULL
            AND pd."date" = DATE '2026-05-01'
        )
    `);
  }

  public async down(): Promise<void> {
    // Keep seeded finance records to avoid removing user-visible demo data.
  }
}
