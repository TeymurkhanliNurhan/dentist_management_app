import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

/** For databases that ran CreateRandevueTable before `patient` was added. */
export class AddPatientToRandevue1770000000001 implements MigrationInterface {
  name = 'AddPatientToRandevue1770000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('Randevue');
    if (!table || table.findColumnByName('patient')) {
      return;
    }

    await queryRunner.addColumn(
      'Randevue',
      new TableColumn({
        name: 'patient',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.query(`
            UPDATE "Randevue" r
            SET patient = a.patient
            FROM "Appointment" a
            WHERE r.appointment = a.id AND r.patient IS NULL
        `);

    await queryRunner.query(`DELETE FROM "Randevue" WHERE patient IS NULL`);

    const randevueAfter = await queryRunner.getTable('Randevue');
    const hasPatientFk = randevueAfter?.foreignKeys.some(
      (fk) =>
        fk.columnNames.includes('patient') &&
        fk.referencedTableName === 'Patient',
    );
    if (!hasPatientFk) {
      await queryRunner.createForeignKey(
        'Randevue',
        new TableForeignKey({
          columnNames: ['patient'],
          referencedColumnNames: ['id'],
          referencedTableName: 'Patient',
          onDelete: 'CASCADE',
        }),
      );
    }

    await queryRunner.query(
      `ALTER TABLE "Randevue" ALTER COLUMN "patient" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('Randevue');
    if (!table || !table.findColumnByName('patient')) {
      return;
    }

    const fkPatient = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('patient') !== -1,
    );
    if (fkPatient) {
      await queryRunner.dropForeignKey('Randevue', fkPatient);
    }

    await queryRunner.dropColumn('Randevue', 'patient');
  }
}
