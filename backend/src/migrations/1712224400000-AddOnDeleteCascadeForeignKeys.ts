import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnDeleteCascadeForeignKeys1712224400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing foreign keys
    await queryRunner.query(
      `ALTER TABLE "Tooth_Treatment_Medicine" DROP CONSTRAINT "FK_45ea6dceab24c7857b0def75ff0"`
    );

    // Add new foreign key with CASCADE
    await queryRunner.query(
      `ALTER TABLE "Tooth_Treatment_Medicine" ADD CONSTRAINT "FK_45ea6dceab24c7857b0def75ff0" FOREIGN KEY ("Tooth_Treatment") REFERENCES "Tooth_Treatment"("id") ON DELETE CASCADE`
    );

    // Drop existing foreign keys on Tooth_Treatment table
    await queryRunner.query(
      `ALTER TABLE "Tooth_Treatment" DROP CONSTRAINT "FK_appointment_id"`
    );

    await queryRunner.query(
      `ALTER TABLE "Tooth_Treatment" DROP CONSTRAINT "FK_treatment_id"`
    );

    // Add new foreign keys with CASCADE
    await queryRunner.query(
      `ALTER TABLE "Tooth_Treatment" ADD CONSTRAINT "FK_appointment_id" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE CASCADE`
    );

    await queryRunner.query(
      `ALTER TABLE "Tooth_Treatment" ADD CONSTRAINT "FK_treatment_id" FOREIGN KEY ("treatment") REFERENCES "Treatment"("id") ON DELETE CASCADE`
    );

    // Drop existing foreign key on Media table
    await queryRunner.query(
      `ALTER TABLE "Media" DROP CONSTRAINT "FK_Tooth_Treatment_id"`
    );

    // Add new foreign key with CASCADE
    await queryRunner.query(
      `ALTER TABLE "Media" ADD CONSTRAINT "FK_Tooth_Treatment_id" FOREIGN KEY ("Tooth_Treatment_id") REFERENCES "Tooth_Treatment"("id") ON DELETE CASCADE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert Tooth_Treatment_Medicine
    await queryRunner.query(
      `ALTER TABLE "Tooth_Treatment_Medicine" DROP CONSTRAINT "FK_45ea6dceab24c7857b0def75ff0"`
    );

    await queryRunner.query(
      `ALTER TABLE "Tooth_Treatment_Medicine" ADD CONSTRAINT "FK_45ea6dceab24c7857b0def75ff0" FOREIGN KEY ("Tooth_Treatment") REFERENCES "Tooth_Treatment"("id")`
    );

    // Revert Tooth_Treatment
    await queryRunner.query(
      `ALTER TABLE "Tooth_Treatment" DROP CONSTRAINT "FK_appointment_id"`
    );

    await queryRunner.query(
      `ALTER TABLE "Tooth_Treatment" DROP CONSTRAINT "FK_treatment_id"`
    );

    await queryRunner.query(
      `ALTER TABLE "Tooth_Treatment" ADD CONSTRAINT "FK_appointment_id" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id")`
    );

    await queryRunner.query(
      `ALTER TABLE "Tooth_Treatment" ADD CONSTRAINT "FK_treatment_id" FOREIGN KEY ("treatment") REFERENCES "Treatment"("id")`
    );

    // Revert Media
    await queryRunner.query(
      `ALTER TABLE "Media" DROP CONSTRAINT "FK_Tooth_Treatment_id"`
    );

    await queryRunner.query(
      `ALTER TABLE "Media" ADD CONSTRAINT "FK_Tooth_Treatment_id" FOREIGN KEY ("Tooth_Treatment_id") REFERENCES "Tooth_Treatment"("id")`
    );
  }
}

