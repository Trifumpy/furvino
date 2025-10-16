-- Add pageLayout JSONB column to Novel for customizable page sections
ALTER TABLE "public"."Novel" ADD COLUMN IF NOT EXISTS "pageLayout" JSONB;

