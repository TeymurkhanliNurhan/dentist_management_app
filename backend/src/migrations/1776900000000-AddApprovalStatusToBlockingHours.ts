import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApprovalStatusToBlockingHours1776900000000
  implements MigrationInterface
{
  name = 'AddApprovalStatusToBlockingHours1776900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blocking_hours_approval_status_enum') THEN
          CREATE TYPE "blocking_hours_approval_status_enum" AS ENUM ('awaiting', 'canceled', 'rejected', 'approved');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      ALTER TABLE "Blocking_hours"
      ADD COLUMN IF NOT EXISTS "approvalStatus" "blocking_hours_approval_status_enum" NOT NULL DEFAULT 'awaiting'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Blocking_hours"
      DROP COLUMN IF EXISTS "approvalStatus"
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "blocking_hours_approval_status_enum"
    `);
  }
}
