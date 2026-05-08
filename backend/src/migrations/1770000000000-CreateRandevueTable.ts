import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateRandevueTable1770000000000 implements MigrationInterface {
  name = 'CreateRandevueTable1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'Randevue',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'date',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'endTime',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'note',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'patient',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'appointment',
            type: 'int',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    let randevueTable = await queryRunner.getTable('Randevue');
    if (!randevueTable) {
      return;
    }

    const hasFkPatient = randevueTable.foreignKeys.some(
      (fk) =>
        fk.columnNames.includes('patient') &&
        fk.referencedTableName === 'Patient',
    );
    if (!hasFkPatient) {
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

    randevueTable = await queryRunner.getTable('Randevue');
    if (!randevueTable) {
      return;
    }

    const hasFkAppointment = randevueTable.foreignKeys.some(
      (fk) =>
        fk.columnNames.includes('appointment') &&
        fk.referencedTableName === 'Appointment',
    );
    if (!hasFkAppointment) {
      await queryRunner.createForeignKey(
        'Randevue',
        new TableForeignKey({
          columnNames: ['appointment'],
          referencedColumnNames: ['id'],
          referencedTableName: 'Appointment',
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    let table = await queryRunner.getTable('Randevue');
    if (table) {
      const fkAppointment = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('appointment') !== -1,
      );
      if (fkAppointment) {
        await queryRunner.dropForeignKey('Randevue', fkAppointment);
      }
      table = await queryRunner.getTable('Randevue');
      if (table) {
        const fkPatient = table.foreignKeys.find(
          (fk) => fk.columnNames.indexOf('patient') !== -1,
        );
        if (fkPatient) {
          await queryRunner.dropForeignKey('Randevue', fkPatient);
        }
      }
    }
    await queryRunner.dropTable('Randevue');
  }
}
