import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** For databases that ran CreateRandevueTable before `endTime` was added. */
export class AddEndTimeToRandevue1770000000002 implements MigrationInterface {
  name = 'AddEndTimeToRandevue1770000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('Randevue');
    if (!table || table.findColumnByName('endTime')) {
      return;
    }

    await queryRunner.addColumn(
      'Randevue',
      new TableColumn({
        name: 'endTime',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.query(
      `UPDATE "Randevue" SET "endTime" = "date" WHERE "endTime" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Randevue" ALTER COLUMN "endTime" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('Randevue');
    if (!table || !table.findColumnByName('endTime')) {
      return;
    }

    await queryRunner.dropColumn('Randevue', 'endTime');
  }
}
