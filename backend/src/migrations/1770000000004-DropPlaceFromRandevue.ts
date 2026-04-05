import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropPlaceFromRandevue1770000000004 implements MigrationInterface {
    name = 'DropPlaceFromRandevue1770000000004';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('Randevue');
        if (!table) return;
        const hasPlace = table.columns.some((c) => c.name === 'place');
        if (hasPlace) {
            await queryRunner.dropColumn('Randevue', 'place');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('Randevue');
        if (!table) return;
        const hasPlace = table.columns.some((c) => c.name === 'place');
        if (!hasPlace) {
            await queryRunner.query(
                `ALTER TABLE "Randevue" ADD "place" character varying(255)`,
            );
        }
    }
}
