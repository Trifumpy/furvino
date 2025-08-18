-- Drop any accidental unique constraints on single columns
ALTER TABLE "AuthorManager" DROP CONSTRAINT IF EXISTS "AuthorManager_authorId_key";
ALTER TABLE "AuthorManager" DROP CONSTRAINT IF EXISTS "AuthorManager_userId_key";

-- Ensure composite unique constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'AuthorManager_author_user_unique'
  ) THEN
    ALTER TABLE "AuthorManager" ADD CONSTRAINT "AuthorManager_author_user_unique" UNIQUE ("authorId", "userId");
  END IF;
END$$;


