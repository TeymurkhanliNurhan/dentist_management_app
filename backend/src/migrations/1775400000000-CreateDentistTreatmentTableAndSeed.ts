import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dentist_Treatment: Many-to-many join between Dentist and Treatment.
 * Backfill rule: for existing Treatment rows, create a join row where Dentist.id == Treatment.clinicId
 * (only when such Dentist exists; this matches the project's legacy id-alignment convention).
 */
export class CreateDentistTreatmentTableAndSeed1775400000000
  implements MigrationInterface
{
  name = 'CreateDentistTreatmentTableAndSeed1775400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "Dentist_Treatment" (
        "Treatment" integer NOT NULL,
        "Dentist" integer NOT NULL,
        CONSTRAINT "PK_Dentist_Treatment" PRIMARY KEY ("Treatment", "Dentist"),
        CONSTRAINT "FK_Dentist_Treatment_Treatment" FOREIGN KEY ("Treatment") REFERENCES "Treatment"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_Dentist_Treatment_Dentist" FOREIGN KEY ("Dentist") REFERENCES "Dentist"("id") ON DELETE CASCADE
      )
    `);

    // Backfill: map every treatment to its clinic's aligned dentist id.
    await queryRunner.query(`
      INSERT INTO "Dentist_Treatment" ("Treatment", "Dentist")
      SELECT t."id" AS "Treatment", t."clinicId" AS "Dentist"
      FROM "Treatment" t
      WHERE t."clinicId" IS NOT NULL
        AND EXISTS (SELECT 1 FROM "Dentist" d WHERE d."id" = t."clinicId")
        AND NOT EXISTS (
          SELECT 1
          FROM "Dentist_Treatment" dt
          WHERE dt."Treatment" = t."id" AND dt."Dentist" = t."clinicId"
        )
    `);
  }

  public async down(): Promise<void> {
    // Intentionally empty: reverse migration is not supported.
  }
}
