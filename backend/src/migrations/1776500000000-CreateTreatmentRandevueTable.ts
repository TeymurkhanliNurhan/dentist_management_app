import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateTreatmentRandevueTable1776500000000
  implements MigrationInterface
{
  name = 'CreateTreatmentRandevueTable1776500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'Treatment_Randevue',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'tooth_treatment_teeth_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'randevue_id',
            type: 'int',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    const table = await queryRunner.getTable('Treatment_Randevue');
    if (!table) {
      return;
    }

    const hasFkToothTreatmentTeeth = table.foreignKeys.some(
      (fk) =>
        fk.columnNames.length === 1 &&
        fk.columnNames[0] === 'tooth_treatment_teeth_id' &&
        fk.referencedTableName === 'ToothTreatmentTeeth',
    );
    if (!hasFkToothTreatmentTeeth) {
      await queryRunner.createForeignKey(
        'Treatment_Randevue',
        new TableForeignKey({
          columnNames: ['tooth_treatment_teeth_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'ToothTreatmentTeeth',
          onDelete: 'CASCADE',
        }),
      );
    }

    const hasFkRandevue = table.foreignKeys.some(
      (fk) =>
        fk.columnNames.length === 1 &&
        fk.columnNames[0] === 'randevue_id' &&
        fk.referencedTableName === 'Randevue',
    );
    if (!hasFkRandevue) {
      await queryRunner.createForeignKey(
        'Treatment_Randevue',
        new TableForeignKey({
          columnNames: ['randevue_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'Randevue',
          onDelete: 'CASCADE',
        }),
      );
    }

    const updatedTable = await queryRunner.getTable('Treatment_Randevue');
    if (!updatedTable) {
      return;
    }

    const hasIdxToothTreatmentTeeth = updatedTable.indices.some(
      (ix) =>
        ix.columnNames.length === 1 &&
        ix.columnNames[0] === 'tooth_treatment_teeth_id',
    );
    if (!hasIdxToothTreatmentTeeth) {
      await queryRunner.createIndex(
        'Treatment_Randevue',
        new TableIndex({
          columnNames: ['tooth_treatment_teeth_id'],
        }),
      );
    }

    const hasIdxRandevue = updatedTable.indices.some(
      (ix) => ix.columnNames.length === 1 && ix.columnNames[0] === 'randevue_id',
    );
    if (!hasIdxRandevue) {
      await queryRunner.createIndex(
        'Treatment_Randevue',
        new TableIndex({
          columnNames: ['randevue_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('Treatment_Randevue');
  }
}
