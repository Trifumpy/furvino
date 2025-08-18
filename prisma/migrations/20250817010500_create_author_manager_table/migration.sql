-- Create AuthorManager table with TEXT ids to match existing schema
CREATE TABLE IF NOT EXISTS "AuthorManager" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  "authorId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "AuthorManager_author_user_unique" UNIQUE ("authorId", "userId"),
  CONSTRAINT "AuthorManager_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE,
  CONSTRAINT "AuthorManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "AuthorManager_author_idx" ON "AuthorManager" ("authorId");
CREATE INDEX IF NOT EXISTS "AuthorManager_user_idx" ON "AuthorManager" ("userId");


