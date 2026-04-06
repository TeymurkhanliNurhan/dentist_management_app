import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class AddPatientDeleteCascadeForeignKeys1771000000000 implements MigrationInterface {
    name = 'AddPatientDeleteCascadeForeignKeys1771000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.recreateAppointmentPatientForeignKey(queryRunner, 'CASCADE');
        await this.recreatePatientTeethPatientForeignKey(queryRunner, 'CASCADE');
        await this.recreateToothTreatmentTeethPatientToothForeignKey(queryRunner, 'CASCADE');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await this.recreateToothTreatmentTeethPatientToothForeignKey(queryRunner, 'NO ACTION');
        await this.recreatePatientTeethPatientForeignKey(queryRunner, 'NO ACTION');
        await this.recreateAppointmentPatientForeignKey(queryRunner, 'NO ACTION');
    }

    private async recreateAppointmentPatientForeignKey(queryRunner: QueryRunner, onDelete: 'CASCADE' | 'NO ACTION'): Promise<void> {
        const table = await queryRunner.getTable('Appointment');
        if (!table) return;

        const fk = table.foreignKeys.find(
            (x) => x.columnNames.length === 1 && x.columnNames[0] === 'patient' && x.referencedTableName === 'Patient',
        );
        if (fk) {
            await queryRunner.dropForeignKey('Appointment', fk);
        }

        await queryRunner.createForeignKey(
            'Appointment',
            new TableForeignKey({
                columnNames: ['patient'],
                referencedTableName: 'Patient',
                referencedColumnNames: ['id'],
                onDelete,
            }),
        );
    }

    private async recreatePatientTeethPatientForeignKey(queryRunner: QueryRunner, onDelete: 'CASCADE' | 'NO ACTION'): Promise<void> {
        const table = await queryRunner.getTable('Patient_Teeth');
        if (!table) return;

        const fk = table.foreignKeys.find(
            (x) => x.columnNames.length === 1 && x.columnNames[0] === 'patient' && x.referencedTableName === 'Patient',
        );
        if (fk) {
            await queryRunner.dropForeignKey('Patient_Teeth', fk);
        }

        await queryRunner.createForeignKey(
            'Patient_Teeth',
            new TableForeignKey({
                columnNames: ['patient'],
                referencedTableName: 'Patient',
                referencedColumnNames: ['id'],
                onDelete,
            }),
        );
    }

    private async recreateToothTreatmentTeethPatientToothForeignKey(
        queryRunner: QueryRunner,
        onDelete: 'CASCADE' | 'NO ACTION',
    ): Promise<void> {
        const table = await queryRunner.getTable('ToothTreatmentTeeth');
        if (!table) return;

        const fk = table.foreignKeys.find(
            (x) =>
                x.columnNames.length === 2 &&
                x.columnNames.includes('patient_id') &&
                x.columnNames.includes('tooth_id') &&
                x.referencedTableName === 'Patient_Teeth',
        );
        if (fk) {
            await queryRunner.dropForeignKey('ToothTreatmentTeeth', fk);
        }

        await queryRunner.createForeignKey(
            'ToothTreatmentTeeth',
            new TableForeignKey({
                columnNames: ['patient_id', 'tooth_id'],
                referencedTableName: 'Patient_Teeth',
                referencedColumnNames: ['patient', 'tooth'],
                onDelete,
            }),
        );
    }
}
