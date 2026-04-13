import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoomWorkingAndBlockingHours1774000000000 implements MigrationInterface {
  name = 'CreateRoomWorkingAndBlockingHours1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "Room" (
        "id" SERIAL NOT NULL,
        "number" character varying(15) NOT NULL,
        "description" text NOT NULL,
        CONSTRAINT "PK_Room_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "Working_hours" (
        "id" SERIAL NOT NULL,
        "dayOfWeek" integer NOT NULL,
        "startTime" TIME NOT NULL,
        "endTime" TIME NOT NULL,
        "staff" integer NOT NULL,
        CONSTRAINT "PK_Working_hours_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_Working_hours_staff" FOREIGN KEY ("staff") REFERENCES "Staff"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "Blocking_hours" (
        "id" SERIAL NOT NULL,
        "startTime" TIMESTAMP NOT NULL,
        "endTime" TIMESTAMP NOT NULL,
        "staff" integer NULL,
        "room" integer NULL,
        CONSTRAINT "PK_Blocking_hours_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_Blocking_hours_staff" FOREIGN KEY ("staff") REFERENCES "Staff"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Blocking_hours_room" FOREIGN KEY ("room") REFERENCES "Room"("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "Blocking_hours"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "Working_hours"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "Room"`);
  }
}
