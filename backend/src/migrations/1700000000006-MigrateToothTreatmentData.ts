import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateToothTreatmentData1700000000006
  implements MigrationInterface
{
  name = 'MigrateToothTreatmentData1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO "ToothTreatmentTeeth" (tooth_treatment_id, patient_id, tooth_id)
            SELECT id, patient, tooth FROM "Tooth_Treatment"
            WHERE tooth IS NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DELETE FROM "ToothTreatmentTeeth"
        `);
  }
}
