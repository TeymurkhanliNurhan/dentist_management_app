import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Nullable note only; `place` was removed — use 1770000000004 to drop legacy `place`. */
export class AddPlaceAndNullableNoteToRandevue1770000000003 implements MigrationInterface {
    name = 'AddPlaceAndNullableNoteToRandevue1770000000003';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('Randevue');
        if (!table) return;

        const noteCol = table.columns.find((c) => c.name === 'note');
        if (noteCol && !noteCol.isNullable) {
            await queryRunner.changeColumn(
                'Randevue',
                'note',
                new TableColumn({
                    name: 'note',
                    type: 'text',
                    isNullable: true,
                }),
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('Randevue');
        if (!table) return;

        await queryRunner.query(`UPDATE "Randevue" SET "note" = '' WHERE "note" IS NULL`);
        await queryRunner.changeColumn(
            'Randevue',
            'note',
            new TableColumn({
                name: 'note',
                type: 'text',
                isNullable: false,
            }),
        );
    }
}
