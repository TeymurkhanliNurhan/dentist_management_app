import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

/**
 * Ensures CASCADE on selected FKs. Uses getTable + dropForeignKey so it works when
 * constraint names differ from legacy hard-coded names (e.g. FK_appointment_id).
 */
export class AddOnDeleteCascadeForeignKeys1712224400000 implements MigrationInterface {
  name = 'AddOnDeleteCascadeForeignKeys1712224400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureToothTreatmentMedicineCascade(queryRunner);
    await this.ensureToothTreatmentAppointmentCascade(queryRunner);
    await this.ensureToothTreatmentTreatmentCascade(queryRunner);
    await this.ensureMediaToothTreatmentCascade(queryRunner);
  }

  private isCascade(fk: TableForeignKey): boolean {
    return (fk.onDelete || '').toUpperCase() === 'CASCADE';
  }

  private async ensureToothTreatmentMedicineCascade(queryRunner: QueryRunner): Promise<void> {
    let table = await queryRunner.getTable('Tooth_Treatment_Medicine');
    if (!table) return;

    const fk = table.foreignKeys.find(
      (x) => x.columnNames.includes('Tooth_Treatment') && x.referencedTableName === 'Tooth_Treatment',
    );
    if (!fk) {
      await queryRunner.createForeignKey(
        'Tooth_Treatment_Medicine',
        new TableForeignKey({
          columnNames: ['Tooth_Treatment'],
          referencedColumnNames: ['id'],
          referencedTableName: 'Tooth_Treatment',
          onDelete: 'CASCADE',
        }),
      );
      return;
    }
    if (this.isCascade(fk)) return;

    await queryRunner.dropForeignKey('Tooth_Treatment_Medicine', fk);
    await queryRunner.createForeignKey(
      'Tooth_Treatment_Medicine',
      new TableForeignKey({
        columnNames: ['Tooth_Treatment'],
        referencedColumnNames: ['id'],
        referencedTableName: 'Tooth_Treatment',
        onDelete: 'CASCADE',
      }),
    );
  }

  private async ensureToothTreatmentAppointmentCascade(queryRunner: QueryRunner): Promise<void> {
    let table = await queryRunner.getTable('Tooth_Treatment');
    if (!table) return;

    const fk = table.foreignKeys.find(
      (x) => x.columnNames.includes('appointment') && x.referencedTableName === 'Appointment',
    );
    if (!fk) {
      await queryRunner.createForeignKey(
        'Tooth_Treatment',
        new TableForeignKey({
          columnNames: ['appointment'],
          referencedColumnNames: ['id'],
          referencedTableName: 'Appointment',
          onDelete: 'CASCADE',
        }),
      );
      return;
    }
    if (this.isCascade(fk)) return;

    await queryRunner.dropForeignKey('Tooth_Treatment', fk);
    await queryRunner.createForeignKey(
      'Tooth_Treatment',
      new TableForeignKey({
        columnNames: ['appointment'],
        referencedColumnNames: ['id'],
        referencedTableName: 'Appointment',
        onDelete: 'CASCADE',
      }),
    );
  }

  private async ensureToothTreatmentTreatmentCascade(queryRunner: QueryRunner): Promise<void> {
    let table = await queryRunner.getTable('Tooth_Treatment');
    if (!table) return;

    const fk = table.foreignKeys.find(
      (x) => x.columnNames.includes('treatment') && x.referencedTableName === 'Treatment',
    );
    if (!fk) {
      await queryRunner.createForeignKey(
        'Tooth_Treatment',
        new TableForeignKey({
          columnNames: ['treatment'],
          referencedColumnNames: ['id'],
          referencedTableName: 'Treatment',
          onDelete: 'CASCADE',
        }),
      );
      return;
    }
    if (this.isCascade(fk)) return;

    await queryRunner.dropForeignKey('Tooth_Treatment', fk);
    await queryRunner.createForeignKey(
      'Tooth_Treatment',
      new TableForeignKey({
        columnNames: ['treatment'],
        referencedColumnNames: ['id'],
        referencedTableName: 'Treatment',
        onDelete: 'CASCADE',
      }),
    );
  }

  private async ensureMediaToothTreatmentCascade(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('Media');
    if (!table) return;

    const fk = table.foreignKeys.find(
      (x) => x.columnNames.includes('Tooth_Treatment_id') && x.referencedTableName === 'Tooth_Treatment',
    );
    if (!fk) {
      await queryRunner.createForeignKey(
        'Media',
        new TableForeignKey({
          columnNames: ['Tooth_Treatment_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'Tooth_Treatment',
          onDelete: 'CASCADE',
        }),
      );
      return;
    }
    if (this.isCascade(fk)) return;

    await queryRunner.dropForeignKey('Media', fk);
    await queryRunner.createForeignKey(
      'Media',
      new TableForeignKey({
        columnNames: ['Tooth_Treatment_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'Tooth_Treatment',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort revert: drop CASCADE FKs and re-add without ON DELETE (RESTRICT default).
    const ttm = await queryRunner.getTable('Tooth_Treatment_Medicine');
    const ttmFk = ttm?.foreignKeys.find(
      (x) => x.columnNames.includes('Tooth_Treatment') && x.referencedTableName === 'Tooth_Treatment',
    );
    if (ttmFk) {
      await queryRunner.dropForeignKey('Tooth_Treatment_Medicine', ttmFk);
      await queryRunner.createForeignKey(
        'Tooth_Treatment_Medicine',
        new TableForeignKey({
          columnNames: ['Tooth_Treatment'],
          referencedColumnNames: ['id'],
          referencedTableName: 'Tooth_Treatment',
        }),
      );
    }

    let tt = await queryRunner.getTable('Tooth_Treatment');
    for (const col of ['appointment', 'treatment'] as const) {
      const refTable = col === 'appointment' ? 'Appointment' : 'Treatment';
      tt = await queryRunner.getTable('Tooth_Treatment');
      const fk = tt?.foreignKeys.find((x) => x.columnNames.includes(col) && x.referencedTableName === refTable);
      if (fk) {
        await queryRunner.dropForeignKey('Tooth_Treatment', fk);
        await queryRunner.createForeignKey(
          'Tooth_Treatment',
          new TableForeignKey({
            columnNames: [col],
            referencedColumnNames: ['id'],
            referencedTableName: refTable,
          }),
        );
      }
    }

    const media = await queryRunner.getTable('Media');
    const mediaFk = media?.foreignKeys.find(
      (x) => x.columnNames.includes('Tooth_Treatment_id') && x.referencedTableName === 'Tooth_Treatment',
    );
    if (mediaFk) {
      await queryRunner.dropForeignKey('Media', mediaFk);
      await queryRunner.createForeignKey(
        'Media',
        new TableForeignKey({
          columnNames: ['Tooth_Treatment_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'Tooth_Treatment',
        }),
      );
    }
  }
}
