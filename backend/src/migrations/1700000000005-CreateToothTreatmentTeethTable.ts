import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateToothTreatmentTeethTable1700000000005 implements MigrationInterface {
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

        await queryRunner.createForeignKey(
            'ToothTreatmentTeeth',
            new TableForeignKey({
                columnNames: ['tooth_treatment_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'Tooth_Treatment',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'ToothTreatmentTeeth',
            new TableForeignKey({
                columnNames: ['patient_id', 'tooth_id'],
                referencedColumnNames: ['patient', 'tooth'],
                referencedTableName: 'Patient_Teeth',
            }),
        );

        await queryRunner.createIndex(
            'ToothTreatmentTeeth',
            new TableIndex({
                columnNames: ['tooth_treatment_id'],
            }),
        );

        await queryRunner.createIndex(
            'ToothTreatmentTeeth',
            new TableIndex({
                columnNames: ['patient_id', 'tooth_id'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('ToothTreatmentTeeth');
    }
}
