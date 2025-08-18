-- Add externalUrls JSONB column to Author
ALTER TABLE "Author" ADD COLUMN IF NOT EXISTS "externalUrls" JSONB;


