import { MigrationInterface, QueryRunner } from 'typeorm';

export class StaffRoleSalaryAndMedicineInventory1776100000000
  implements MigrationInterface
{
  name = 'StaffRoleSalaryAndMedicineInventory1776100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Staff"
      ADD COLUMN IF NOT EXISTS "role" varchar(20) NULL
    `);

    await queryRunner.query(`
      UPDATE "Staff" s
      SET "role" = CASE
        WHEN EXISTS (SELECT 1 FROM "Dentist" d WHERE d."staffId" = s.id) THEN 'Dentist'
        WHEN EXISTS (SELECT 1 FROM "Director" dr WHERE dr."staffId" = s.id) THEN 'Director'
        WHEN EXISTS (SELECT 1 FROM "Nurse" n WHERE n."staffId" = s.id) THEN 'Nurse'
        WHEN EXISTS (SELECT 1 FROM "FrontDeskWorker" f WHERE f."staffId" = s.id) THEN 'Receptionist'
        ELSE s."role"
      END
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "Salary" (
        "staffId" integer NOT NULL,
        "salary" double precision NULL,
        "salaryDay" integer NULL,
        "treatmentPercentage" double precision NULL,
        CONSTRAINT "PK_Salary_staffId" PRIMARY KEY ("staffId"),
        CONSTRAINT "FK_Salary_staffId" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "Medicine"
      ADD COLUMN IF NOT EXISTS "stock" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "Medicine"
      ADD COLUMN IF NOT EXISTS "purchasePrice" double precision NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Medicine"
      DROP COLUMN IF EXISTS "purchasePrice"
    `);
    await queryRunner.query(`
      ALTER TABLE "Medicine"
      DROP COLUMN IF EXISTS "stock"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "Salary"`);

    await queryRunner.query(`
      ALTER TABLE "Staff"
      DROP COLUMN IF EXISTS "role"
    `);
  }
}
