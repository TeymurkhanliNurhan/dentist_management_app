import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExpensePaymentDetailsAndPurchaseMedicine1776300000000
  implements MigrationInterface
{
  name = 'CreateExpensePaymentDetailsAndPurchaseMedicine1776300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "Expense" (
        "id" SERIAL NOT NULL,
        "clinicId" integer NOT NULL,
        "name" character varying(127) NOT NULL,
        "description" text NULL,
        "fixedCost" integer NULL,
        "dayOfMonth" integer NULL,
        CONSTRAINT "PK_Expense_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_Expense_clinicId" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "PaymentDetails" (
        "id" SERIAL NOT NULL,
        "expenseId" integer NULL,
        "date" date NOT NULL,
        "salaryId" integer NULL,
        "cost" double precision NOT NULL,
        CONSTRAINT "PK_PaymentDetails_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_PaymentDetails_expenseId" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_PaymentDetails_salaryId" FOREIGN KEY ("salaryId") REFERENCES "Salary"("staffId") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "Purchase_Medicine" (
        "id" SERIAL NOT NULL,
        "medicineId" integer NOT NULL,
        "count" integer NOT NULL,
        "pricePerOne" double precision NOT NULL,
        "totalPrice" double precision NOT NULL,
        "paymentDetailsId" integer NOT NULL,
        CONSTRAINT "PK_Purchase_Medicine_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_Purchase_Medicine_medicineId" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Purchase_Medicine_paymentDetailsId" FOREIGN KEY ("paymentDetailsId") REFERENCES "PaymentDetails"("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "Purchase_Medicine"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "PaymentDetails"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "Expense"`);
  }
}
