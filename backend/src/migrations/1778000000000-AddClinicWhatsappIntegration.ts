import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClinicWhatsappIntegration1778000000000
  implements MigrationInterface
{
  name = 'AddClinicWhatsappIntegration1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "whatsappEnabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "whatsappPhoneNumberId" character varying(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "whatsappBusinessAccountId" character varying(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "whatsappAccessToken" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "whatsappDisplayPhone" character varying(20)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Clinic" DROP COLUMN IF EXISTS "whatsappDisplayPhone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Clinic" DROP COLUMN IF EXISTS "whatsappAccessToken"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Clinic" DROP COLUMN IF EXISTS "whatsappBusinessAccountId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Clinic" DROP COLUMN IF EXISTS "whatsappPhoneNumberId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Clinic" DROP COLUMN IF EXISTS "whatsappEnabled"`,
    );
  }
}
