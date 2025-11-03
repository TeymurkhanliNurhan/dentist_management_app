import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientTeethTrigger1700000000001 implements MigrationInterface {
    name = 'PatientTeethTrigger1700000000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE OR REPLACE FUNCTION public.patient_teeth_after_insert()
        RETURNS trigger AS $$
        BEGIN
            INSERT INTO "Patient_Teeth" (patient, tooth)
            SELECT NEW.id, g
            FROM generate_series(1, 52) AS g;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_patient_teeth_after_insert ON "Patient";
        CREATE TRIGGER trg_patient_teeth_after_insert
        AFTER INSERT ON "Patient"
        FOR EACH ROW
        EXECUTE FUNCTION public.patient_teeth_after_insert();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        DROP TRIGGER IF EXISTS trg_patient_teeth_after_insert ON "Patient";
        DROP FUNCTION IF EXISTS public.patient_teeth_after_insert();
        `);
    }
}


