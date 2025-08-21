-- AlterTable
ALTER TABLE "public"."Novel" 
  RENAME COLUMN "magnetUrls" TO "downloadUrls";

ALTER TABLE "public"."Novel"
  ADD COLUMN "bannerUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."GalleryItem" (
  "id" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "footer" TEXT,
  "imageUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalleryItem_novelId_idx" ON "public"."GalleryItem"("novelId");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryItem_novelId_imageUrl_key" ON "public"."GalleryItem"("novelId", "imageUrl");

-- AddForeignKey
ALTER TABLE "public"."GalleryItem" ADD CONSTRAINT "GalleryItem_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "public"."Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
