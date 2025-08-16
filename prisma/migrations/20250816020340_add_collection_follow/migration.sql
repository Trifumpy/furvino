-- CreateTable
CREATE TABLE "public"."CollectionFollow" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionFollow_userId_idx" ON "public"."CollectionFollow"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionFollow_collectionId_userId_key" ON "public"."CollectionFollow"("collectionId", "userId");

-- AddForeignKey
ALTER TABLE "public"."CollectionFollow" ADD CONSTRAINT "CollectionFollow_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "public"."Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollectionFollow" ADD CONSTRAINT "CollectionFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
