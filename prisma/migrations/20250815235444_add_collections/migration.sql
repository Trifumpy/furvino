-- CreateTable
CREATE TABLE "public"."Collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Collection_userId_idx" ON "public"."Collection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_userId_name_key" ON "public"."Collection"("userId", "name");

-- CreateIndex
CREATE INDEX "CollectionItem_novelId_idx" ON "public"."CollectionItem"("novelId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionItem_collectionId_novelId_key" ON "public"."CollectionItem"("collectionId", "novelId");

-- AddForeignKey
ALTER TABLE "public"."Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "public"."Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollectionItem" ADD CONSTRAINT "CollectionItem_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "public"."Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
