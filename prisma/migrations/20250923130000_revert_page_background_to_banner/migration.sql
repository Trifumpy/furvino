-- Conditionally rename column pageBackgroundUrl -> bannerUrl on Novel (no-op if not present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Novel'
      AND column_name = 'pageBackgroundUrl'
  ) THEN
    ALTER TABLE "public"."Novel"
      RENAME COLUMN "pageBackgroundUrl" TO "bannerUrl";
  END IF;
END $$;

