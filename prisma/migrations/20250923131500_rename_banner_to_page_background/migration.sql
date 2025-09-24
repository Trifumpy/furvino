-- Rename column bannerUrl -> pageBackgroundUrl on Novel
ALTER TABLE "public"."Novel"
  RENAME COLUMN "bannerUrl" TO "pageBackgroundUrl";


