import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * TypeORM synchronize:true does NOT drop columns removed from entities — legacy Dentist
 * columns often remain until this migration (or manual SQL) runs.
 * Safe to run multiple times (idempotent).
 */
export class SlimDentistDropLegacyColumns1773000000002
  implements MigrationInterface
{
  name = 'SlimDentistDropLegacyColumns1773000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_schema = 'public' AND constraint_name = 'UQ_Dentist_staffId' AND table_name = 'Dentist'
        ) THEN
          ALTER TABLE "Dentist" ADD CONSTRAINT "UQ_Dentist_staffId" UNIQUE ("staffId");
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_schema = 'public' AND constraint_name = 'FK_Dentist_staffId' AND table_name = 'Dentist'
        ) THEN
          ALTER TABLE "Dentist"
          ADD CONSTRAINT "FK_Dentist_staffId" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Dentist' AND column_name = 'staffId'
        ) AND NOT EXISTS (
          SELECT 1 FROM "Dentist" WHERE "staffId" IS NULL
        ) THEN
          ALTER TABLE "Dentist" ALTER COLUMN "staffId" SET NOT NULL;
        END IF;
      END$$;
    `);

    const legacyColumns = [
      'name',
      'surname',
      'birthDate',
      'gmail',
      'password',
      'isEmailVerified',
      'verificationCode',
      'verificationCodeExpiry',
    ];

    for (const col of legacyColumns) {
      await queryRunner.query(
        `ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "${col}"`,
      );
    }
  }

  public async down(): Promise<void> {
    // Intentionally empty: restoring denormalized columns is not supported.
  }
}
