-- Rename column pageBackgroundUrl -> bannerUrl on Novel
ALTER TABLE "public"."Novel"
  RENAME COLUMN "pageBackgroundUrl" TO "bannerUrl";

