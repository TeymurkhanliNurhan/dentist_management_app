import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateMediaTable1743700000000 implements MigrationInterface {
    name = 'CreateMediaTable1743700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'Media',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'photo_url',
                        type: 'varchar',
                        length: '500',
                        isNullable: false,
                    },
                    {
                        name: 'name',
                        type: 'text',
                        isNullable: false,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'Tooth_Treatment_id',
                        type: 'int',
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

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
        const table = await queryRunner.getTable('Media');
        if (table) {
            const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('Tooth_Treatment_id') !== -1);
            if (foreignKey) {
                await queryRunner.dropForeignKey('Media', foreignKey);
            }
        }
        await queryRunner.dropTable('Media');
    }
}