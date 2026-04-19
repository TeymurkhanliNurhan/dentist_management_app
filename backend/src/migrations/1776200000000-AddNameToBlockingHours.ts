import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameToBlockingHours1776200000000 implements MigrationInterface {
  name = 'AddNameToBlockingHours1776200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Blocking_hours"
      ADD COLUMN "name" character varying(127) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Blocking_hours" DROP COLUMN "name"`);
  }
}
