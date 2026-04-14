import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateToothTreatmentTeethTable1700000000005
  implements MigrationInterface
{
  name = 'CreateToothTreatmentTeethTable1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ToothTreatmentTeeth',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'tooth_treatment_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'patient_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'tooth_id',
            type: 'int',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    const table = await queryRunner.getTable('ToothTreatmentTeeth');
    if (!table) {
      return;
    }

    const hasFkToothTreatment = table.foreignKeys.some(
      (fk) =>
        fk.columnNames.length === 1 &&
        fk.columnNames[0] === 'tooth_treatment_id' &&
        fk.referencedTableName === 'Tooth_Treatment',
    );
    if (!hasFkToothTreatment) {
      await queryRunner.createForeignKey(
        'ToothTreatmentTeeth',
        new TableForeignKey({
          columnNames: ['tooth_treatment_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'Tooth_Treatment',
          onDelete: 'CASCADE',
        }),
      );
    }

    const hasFkPatientTeeth = table.foreignKeys.some(
      (fk) =>
        fk.columnNames.length === 2 &&
        fk.columnNames.includes('patient_id') &&
        fk.columnNames.includes('tooth_id') &&
        fk.referencedTableName === 'Patient_Teeth',
    );
    if (!hasFkPatientTeeth) {
      await queryRunner.createForeignKey(
        'ToothTreatmentTeeth',
        new TableForeignKey({
          columnNames: ['patient_id', 'tooth_id'],
          referencedColumnNames: ['patient', 'tooth'],
          referencedTableName: 'Patient_Teeth',
        }),
      );
    }

    const tableAfterFk = await queryRunner.getTable('ToothTreatmentTeeth');
    if (!tableAfterFk) {
      return;
    }

    const hasIdxTreatment = tableAfterFk.indices.some(
      (ix) =>
        ix.columnNames.length === 1 &&
        ix.columnNames[0] === 'tooth_treatment_id',
    );
    if (!hasIdxTreatment) {
      await queryRunner.createIndex(
        'ToothTreatmentTeeth',
        new TableIndex({
          columnNames: ['tooth_treatment_id'],
        }),
      );
    }

    const hasIdxPatientTooth = tableAfterFk.indices.some(
      (ix) =>
        ix.columnNames.length === 2 &&
        ix.columnNames.includes('patient_id') &&
        ix.columnNames.includes('tooth_id'),
    );
    if (!hasIdxPatientTooth) {
      await queryRunner.createIndex(
        'ToothTreatmentTeeth',
        new TableIndex({
          columnNames: ['patient_id', 'tooth_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ToothTreatmentTeeth');
  }
}
