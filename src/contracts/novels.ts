import z from "zod";

export const externalSiteEnum = z.enum([
  "discord",
  "patreon",
  "x",
  "itch",
  "bluesky",
  "linktree",
  "carrd",
  "furaffinity",
  "youtube",
  "telegram"
]);
export const platformEnum = z.enum([
  "windows",
  "mac",
  "linux",
  "android",
  "other",
]);

export type ExternalSite = z.infer<typeof externalSiteEnum>;
export type Platform = z.infer<typeof platformEnum>;

export const MAX_TITLE_LENGTH = 100;
export const MAX_SNIPPET_LENGTH = 250;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_TAGS = 10;
export const novelSchema = z.object({
  id: z.string().min(1, "ID cannot be an empty string").optional(),
  title: z.string().min(1, "Title is required").max(MAX_TITLE_LENGTH, `Title cannot exceed ${MAX_TITLE_LENGTH} characters`),
  authorId: z.string().min(1, "Author ID is required"),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  snippet: z.string().max(MAX_SNIPPET_LENGTH).optional(),
  coverImage: z.url().optional(),
  externalUrls: z.partialRecord(externalSiteEnum, z.url()).optional(),
  magnetUrls: z.partialRecord(platformEnum, z.url()).optional(),
  tags: z.array(z.string()).max(MAX_TAGS).optional(),
});
export type NovelSchema = z.infer<typeof novelSchema>;

export type GetNovelParams = { novelId: string };
export type GetNovelResponse = ListedNovel;

export const createNovelSchema = novelSchema.omit({ id: true });
export type CreateNovelBody = z.infer<typeof createNovelSchema>;
export type CreateNovelResponse = ListedNovel;

export type UpdateNovelParams = { novelId: string };
export type UpdateNovelBody = z.infer<typeof novelSchema>;
export type UpdateNovelResponse = ListedNovel;

import { Author } from "@/users/types";

export type ListedNovel = {
  id: string;
  title: string;
  author: Author;
  externalUrls?: Partial<Record<ExternalSite, string>>;
  magnetUrls?: Partial<Record<Platform, string>>;
  description?: string | null;
  snippet?: string | null;
  thumbnailUrl?: string | null;
  tags: string[];
  comments: CommentsSummary;
  stats: Stats;
  ratingsSummary: RatingsSummary;
}

export type CommentsSummary = {
  total: number;
  recent: Comment[];
}

export type RatingsSummary = {
  total: number;
  average: number;
  recent: UserRating[];
}

export type Stats = {
  downloads: number;
  favorites: number;
  views: number;
}

export type Comment = {
  authorId: string;
  text: string;
}

export type UserRating = {
  userId: string;
  value: number;
}
