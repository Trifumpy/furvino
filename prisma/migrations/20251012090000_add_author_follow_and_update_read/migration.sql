-- CreateTable AuthorFollow
CREATE TABLE "public"."AuthorFollow" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorFollow_pkey" PRIMARY KEY ("id")
);

-- Indexes for AuthorFollow
CREATE INDEX "AuthorFollow_userId_idx" ON "public"."AuthorFollow"("userId");
CREATE UNIQUE INDEX "AuthorFollow_authorId_userId_key" ON "public"."AuthorFollow"("authorId", "userId");

-- Foreign keys for AuthorFollow
ALTER TABLE "public"."AuthorFollow" ADD CONSTRAINT "AuthorFollow_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."AuthorFollow" ADD CONSTRAINT "AuthorFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable NovelUpdateRead
CREATE TABLE "public"."NovelUpdateRead" (
    "id" TEXT NOT NULL,
    "updateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NovelUpdateRead_pkey" PRIMARY KEY ("id")
);

-- Indexes for NovelUpdateRead
CREATE INDEX "NovelUpdateRead_userId_idx" ON "public"."NovelUpdateRead"("userId");
CREATE UNIQUE INDEX "NovelUpdateRead_updateId_userId_key" ON "public"."NovelUpdateRead"("updateId", "userId");

-- Foreign keys for NovelUpdateRead
ALTER TABLE "public"."NovelUpdateRead" ADD CONSTRAINT "NovelUpdateRead_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "public"."NovelUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."NovelUpdateRead" ADD CONSTRAINT "NovelUpdateRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


