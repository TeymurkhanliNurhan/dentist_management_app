import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class RemovePatientToothForeignKey1700000000007 implements MigrationInterface {
    name = 'RemovePatientToothForeignKey1700000000007';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('Tooth_Treatment');
        if (table) {
            const fk = table.foreignKeys.find(
                (fk) => fk.columnNames.includes('patient') && fk.columnNames.includes('tooth'),
            );
            if (fk) {
                await queryRunner.dropForeignKey('Tooth_Treatment', fk);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('Tooth_Treatment');
        if (table) {
            const fk = table.foreignKeys.find(
                (fk) => fk.columnNames.includes('patient') && fk.columnNames.includes('tooth'),
            );
            if (!fk) {
                await queryRunner.createForeignKey(
                    'Tooth_Treatment',
                    new TableForeignKey({
                        columnNames: ['patient', 'tooth'],
                        referencedColumnNames: ['patient', 'tooth'],
                        referencedTableName: 'Patient_Teeth',
                    }),
                );
            }
        }
    }
}
