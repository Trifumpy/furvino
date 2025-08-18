-- Create join table for author managers
CREATE TABLE IF NOT EXISTS "AuthorManager" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  "authorId" TEXT NOT NULL REFERENCES "Author"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "AuthorManager_author_user_unique" UNIQUE ("authorId", "userId")
);

CREATE INDEX IF NOT EXISTS "AuthorManager_author_idx" ON "AuthorManager" ("authorId");
CREATE INDEX IF NOT EXISTS "AuthorManager_user_idx" ON "AuthorManager" ("userId");


