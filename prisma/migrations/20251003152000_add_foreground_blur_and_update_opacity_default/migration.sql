-- Add blur column and adjust default opacity
ALTER TABLE "public"."Novel"
  ADD COLUMN IF NOT EXISTS "foregroundBlurPercent" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "public"."Novel"
  ALTER COLUMN "foregroundOpacityPercent" SET DEFAULT 20;


