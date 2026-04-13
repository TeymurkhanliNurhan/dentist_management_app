-- Run this in Supabase SQL Editor if Dentist still has old columns.
-- Why: TypeORM synchronize:true usually does NOT drop columns from existing tables.
-- Goal: keep only id + staffId on "Dentist" (plus indexes/constraints).

ALTER TABLE "Dentist" ADD COLUMN IF NOT EXISTS "staffId" integer;

UPDATE "Dentist" d
SET "staffId" = s."id"
FROM "Staff" s
WHERE d."staffId" IS NULL
  AND d."id" = s."id";

UPDATE "Dentist" SET "staffId" = 1 WHERE "id" = 1 AND "staffId" IS NULL;

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

ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "isEmailVerified" boolean NOT NULL DEFAULT false;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "verificationCode" character varying(6) NULL;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "verificationCodeExpiry" timestamp NULL;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'UQ_Dentist_staffId' AND table_name = 'Dentist'
  ) THEN
    ALTER TABLE "Dentist" ADD CONSTRAINT "UQ_Dentist_staffId" UNIQUE ("staffId");
  END IF;
END$$;

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Dentist" WHERE "staffId" IS NULL) THEN
    ALTER TABLE "Dentist" ALTER COLUMN "staffId" SET NOT NULL;
  ELSE
    RAISE EXCEPTION 'Dentist.staffId is still NULL for some rows; fix data before running the rest.';
  END IF;
END$$;

ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "name";
ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "surname";
ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "birthDate";
ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "gmail";
ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "password";
ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "isEmailVerified";
ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "verificationCode";
ALTER TABLE "Dentist" DROP COLUMN IF EXISTS "verificationCodeExpiry";
