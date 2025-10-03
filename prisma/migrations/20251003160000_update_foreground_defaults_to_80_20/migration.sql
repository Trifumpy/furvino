-- Update defaults to opacity 80 and blur 20
ALTER TABLE "public"."Novel"
  ALTER COLUMN "foregroundOpacityPercent" SET DEFAULT 80;

ALTER TABLE "public"."Novel"
  ALTER COLUMN "foregroundBlurPercent" SET DEFAULT 20;


