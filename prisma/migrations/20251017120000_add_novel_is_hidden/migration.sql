-- Add isHidden flag to Novel to control visibility in public lists
ALTER TABLE "public"."Novel"
  ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT FALSE;


