-- Add user moderation flags
ALTER TABLE "public"."User"
  ADD COLUMN "banCommentingAndRating" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "public"."User"
  ADD COLUMN "banAuthorCreation" BOOLEAN NOT NULL DEFAULT FALSE;


