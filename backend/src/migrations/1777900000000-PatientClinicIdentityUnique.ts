import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientClinicIdentityUnique1777900000000
  implements MigrationInterface
{
  name = 'PatientClinicIdentityUnique1777900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Patient" DROP CONSTRAINT IF EXISTS "UQ_Patient_phone"`,
    );

    await queryRunner.query(`
      CREATE TEMP TABLE "_patient_identity_dupes" AS
      SELECT
        p.id AS dupe_id,
        MIN(p.id) OVER (
          PARTITION BY p."clinicId", p.name, p.surname, p."birthDate"
        ) AS keep_id
      FROM "Patient" p
    `);

    await queryRunner.query(`
      DELETE FROM "_patient_identity_dupes"
      WHERE dupe_id = keep_id
    `);

    await queryRunner.query(`
      UPDATE "Appointment" a
      SET patient = d.keep_id
      FROM "_patient_identity_dupes" d
      WHERE a.patient = d.dupe_id
    `);

    await queryRunner.query(`
      UPDATE "Randevue" r
      SET patient = d.keep_id
      FROM "_patient_identity_dupes" d
      WHERE r.patient = d.dupe_id
    `);

    await queryRunner.query(`
      UPDATE "Tooth_Treatment" tt
      SET patient = d.keep_id
      FROM "_patient_identity_dupes" d
      WHERE tt.patient = d.dupe_id
    `);

    await queryRunner.query(`
      DELETE FROM "Patient_Teeth" pt
      USING "_patient_identity_dupes" d
      WHERE pt.patient = d.dupe_id
        AND EXISTS (
          SELECT 1
          FROM "Patient_Teeth" existing
          WHERE existing.patient = d.keep_id
            AND existing.tooth = pt.tooth
        )
    `);

    await queryRunner.query(`
      UPDATE "Patient_Teeth" pt
      SET patient = d.keep_id
      FROM "_patient_identity_dupes" d
      WHERE pt.patient = d.dupe_id
    `);

    await queryRunner.query(`
      DELETE FROM "Patient" p
      USING "_patient_identity_dupes" d
      WHERE p.id = d.dupe_id
    `);

    await queryRunner.query(`DROP TABLE "_patient_identity_dupes"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = 'Patient'
            AND constraint_name = 'UQ_Patient_clinic_identity'
        ) THEN
          ALTER TABLE "Patient"
          ADD CONSTRAINT "UQ_Patient_clinic_identity"
          UNIQUE ("clinicId", "name", "surname", "birthDate");
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Patient" DROP CONSTRAINT IF EXISTS "UQ_Patient_clinic_identity"`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = 'Patient'
            AND constraint_name = 'UQ_Patient_phone'
        ) THEN
          ALTER TABLE "Patient" ADD CONSTRAINT "UQ_Patient_phone" UNIQUE ("phone");
        END IF;
      END$$;
    `);
  }
}
