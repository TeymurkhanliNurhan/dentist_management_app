import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestructureStaffRoles1773000000000 implements MigrationInterface {
  name = 'RestructureStaffRoles1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "Nurse" (
        "id" SERIAL NOT NULL,
        "staffId" integer NOT NULL,
        CONSTRAINT "UQ_Nurse_staffId" UNIQUE ("staffId"),
        CONSTRAINT "PK_Nurse_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_Nurse_staffId" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "FrontDeskWorker" (
        "id" SERIAL NOT NULL,
        "staffId" integer NOT NULL,
        CONSTRAINT "UQ_FrontDeskWorker_staffId" UNIQUE ("staffId"),
        CONSTRAINT "PK_FrontDeskWorker_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_FrontDeskWorker_staffId" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "Dentist" ADD COLUMN IF NOT EXISTS "staffId" integer`,
    );

    await queryRunner.query(`
      UPDATE "Dentist" d
      SET "staffId" = s."id"
      FROM "Staff" s
      WHERE d."staffId" IS NULL
        AND d."id" = s."id"
    `);

    await queryRunner.query(
      `UPDATE "Dentist" SET "staffId" = 1 WHERE "id" = 1 AND "staffId" IS NULL`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Dentist' AND column_name = 'gmail'
        ) THEN
          UPDATE "Dentist" d
          SET "staffId" = s."id"
          FROM "Staff" s
          WHERE d."staffId" IS NULL
            AND d."gmail" = s."gmail";
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'UQ_Dentist_staffId'
            AND table_name = 'Dentist'
        ) THEN
          ALTER TABLE "Dentist" ADD CONSTRAINT "UQ_Dentist_staffId" UNIQUE ("staffId");
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_Dentist_staffId'
            AND table_name = 'Dentist'
        ) THEN
          ALTER TABLE "Dentist"
          ADD CONSTRAINT "FK_Dentist_staffId" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(
      `ALTER TABLE "Dentist" ALTER COLUMN "staffId" SET NOT NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "isEmailVerified" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "verificationCode" character varying(6) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "verificationCodeExpiry" timestamp NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Dentist' AND column_name = 'isEmailVerified'
        ) THEN
          UPDATE "Staff" s
          SET
            "isEmailVerified" = COALESCE(d."isEmailVerified", false),
            "verificationCode" = d."verificationCode",
            "verificationCodeExpiry" = d."verificationCodeExpiry"
          FROM "Dentist" d
          WHERE d."staffId" = s."id";
        END IF;
      END$$;
    `);

    await queryRunner.query(
      `ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "surname"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "birthDate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "gmail"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "password"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "isEmailVerified"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "verificationCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "verificationCodeExpiry"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Dentist" DROP CONSTRAINT IF EXISTS "FK_Dentist_staffId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Dentist" DROP CONSTRAINT IF EXISTS "UQ_Dentist_staffId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "staffId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "Nurse"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "FrontDeskWorker"`);
  }
}
