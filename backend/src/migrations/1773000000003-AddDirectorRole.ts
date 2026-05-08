import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDirectorRole1773000000003 implements MigrationInterface {
  name = 'AddDirectorRole1773000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "Director" (
        "id" SERIAL NOT NULL,
        "staffId" integer NOT NULL,
        CONSTRAINT "UQ_Director_staffId" UNIQUE ("staffId"),
        CONSTRAINT "PK_Director_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_Director_staffId" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "Director"`);
  }
}
