import { Author } from "@/users/types";
import { urlOrEmpty } from "./core";
import z from "zod";

export const EXTERNAL_SITES = [
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
]
export const PLATFORMS = [
  "windows",
  "mac",
  "linux",
  "android",
  "other"
];
export const externalSiteEnum = z.enum(EXTERNAL_SITES);
export const platformEnum = z.enum(PLATFORMS);
export type ExternalSite = z.infer<typeof externalSiteEnum>;
export type Platform = z.infer<typeof platformEnum>;

export const MAX_GALLERY_FOOTER_LENGTH = 100;
export const galleryItemSchema = z.object({
  footer: z.string().max(MAX_GALLERY_FOOTER_LENGTH).optional(),
  imageUrl: z.url(),
});

export const MAX_TITLE_LENGTH = 100;
export const MAX_SNIPPET_LENGTH = 250;
export const MAX_DESCRIPTION_LENGTH = 10000;
export const MAX_TAGS = 10;
export const MAX_INDEXING_TAGS = 30;
export const MAX_GALLERY_ITEMS = 6;
export const novelSchema = z.object({
  id: z.string().min(1, "ID cannot be an empty string").optional(),
  title: z.string().min(1, "Title is required").max(MAX_TITLE_LENGTH, `Title cannot exceed ${MAX_TITLE_LENGTH} characters`),
  authorId: z.string().min(1, "Author ID is required"),
  // TipTap/ProseMirror JSON document
  descriptionRich: z.unknown().optional(),
  snippet: z.string().max(MAX_SNIPPET_LENGTH).optional(),
  thumbnailUrl: urlOrEmpty.optional(),
  pageBackgroundUrl: urlOrEmpty.optional(),
  foregroundOpacityPercent: z.coerce
    .number()
    .int()
    .min(0)
    .max(100)
    .default(95)
    .optional(),
  foregroundColorHex: z
    .string()
    .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "Enter a valid hex color like #121212")
    .optional(),
  foregroundTextColorHex: z
    .string()
    .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "Enter a valid hex color like #ffffff")
    .optional(),
  galleryItems: z.array(galleryItemSchema).max(MAX_GALLERY_ITEMS, `Gallery cannot exceed ${MAX_GALLERY_ITEMS} items`).optional(),
  externalUrls: z.partialRecord(externalSiteEnum, urlOrEmpty).optional(),
  downloadUrls: z.partialRecord(platformEnum, urlOrEmpty).optional(),
  tags: z.array(z.string()).max(MAX_TAGS).optional(),
  indexingTags: z.array(z.string()).max(MAX_INDEXING_TAGS).optional(),
});
export type NovelSchema = z.infer<typeof novelSchema>;

export type GetNovelParams = { novelId: string };
export type GetNovelResponse = FullNovel;

export const getNovelsQParamsSchema = z.object({
  authorId: z.string(),
  tags: z.array(z.string()),
  search: z.string(),
  sort: z.enum([
    "newest",
    "oldest",
    "lastUpdated",
    "mostViewed",
    "leastViewed",
    "mostRatings",
    "highestRating",
    "lowestRating",
    "mostDiscussed",
    "titleAsc",
    "titleDesc",
  ]),
  page: z.coerce.number().int().min(1),
  pageSize: z.coerce.number().int().min(1).max(100),
}).partial();
export type GetNovelsQParams = z.infer<typeof getNovelsQParamsSchema>;
export type GetNovelsResponse = {
  items: ListedNovel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const createNovelSchema = novelSchema.omit({ id: true });
export type CreateNovelBody = z.infer<typeof createNovelSchema>;
export type CreateNovelResponse = FullNovel;

export const novelTargetSchema = z.object({ novelId: z.string().min(1) });
export type NovelTarget = z.infer<typeof novelTargetSchema>;
export type UpdateNovelParams = NovelTarget;
export type UpdateNovelBody = z.infer<typeof novelSchema>;
export type UpdateNovelResponse = FullNovel;

export const MAX_THUMBNAIL_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export type UpdateNovelThumbnailParams = NovelTarget;
export type UpdateNovelThumbnailBody = FormData;
export type UpdateNovelThumbnailResponse = FullNovel;

export const MAX_PAGE_BACKGROUND_FILE_SIZE = 30 * 1024 * 1024; // 30MB
export type UpdateNovelPageBackgroundParams = NovelTarget;
export type UpdateNovelPageBackgroundBody = FormData;
export type UpdateNovelPageBackgroundResponse = FullNovel;

export const MAX_GALLERY_FILE_SIZE = 12 * 1024 * 1024; // 12MB
export type CreateNovelGalleryItemParams = NovelTarget;
export type CreateNovelGalleryItemBody = FormData;
export type CreateNovelGalleryItemResponse = GalleryItem;
export type DeleteNovelGalleryItemParams = { novelId: string; galleryItemId: string };
export type DeleteNovelGalleryItemResponse = void;

export const MAX_NOVEL_FILE_SIZE = Math.floor(1.5 * 1024 * 1024 * 1024); // 1.5 GB

export type ListedNovel = {
  id: string;
  title: string;
  author: Author;
  externalUrls?: Partial<Record<ExternalSite, string>>;
  downloadUrls?: Partial<Record<Platform, string>>;
  snippet?: string | null;
  thumbnailUrl?: string | null;
  tags: string[];
  indexingTags: string[];
  comments: CommentsSummary;
  stats: Stats;
  ratingsSummary: RatingsSummary;
  createdAt: string;
  updatedAt: string;
}
export type GalleryItem = {
  id: string;
  footer?: string | null;
  imageUrl: string;
  createdAt: string;
}
export type FullNovel = ListedNovel & {
  descriptionRich?: unknown | null;
  pageBackgroundUrl?: string | null;
  foregroundOpacityPercent?: number | null;
  foregroundColorHex?: string | null;
  foregroundTextColorHex?: string | null;
  galleryItems: GalleryItem[];
}

export type CommentsSummary = {
  total: number;
  recent: Comment[];
}

export type RatingsSummary = {
  total: number;
  average: number;
  recent: UserRating[];
  categories?: {
    plot: number;
    characters: number;
    backgroundsUi: number;
    characterArt: number;
    music: number;
    soundEffects: number;
    emotionalImpact: number;
  };
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
  plot?: number;
  characters?: number;
  backgroundsUi?: number;
  characterArt?: number;
  music?: number;
  soundEffects?: number;
  emotionalImpact?: number;
  reason?: string | null;
}

export const ratingCategories = [
  "plot",
  "characters",
  "backgroundsUi",
  "characterArt",
  "music",
  "soundEffects",
  "emotionalImpact",
] as const;
export type RatingCategory = (typeof ratingCategories)[number];

export type UpsertRatingBody = {
  categories: Partial<Record<RatingCategory, number>>;
  reason?: string; // up to 1000 chars
};
export type UpsertRatingResponse = {
  average: number;
  total: number;
  mine: UserRating;
};

export type ListedUserRating = {
  id: string;
  novelId: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    authorId?: string | null;
  };
  plot: number;
  characters: number;
  backgroundsUi: number;
  characterArt: number;
  music: number;
  soundEffects: number;
  emotionalImpact: number;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};
export type GetRecentRatingsResponse = ListedUserRating[];

// Comments API contracts
export type NovelCommentUser = {
  id: string;
  username: string;
  avatarUrl?: string | null;
  authorId?: string | null;
};
export type NovelComment = {
  id: string;
  text: string;
  createdAt: string;
  user: NovelCommentUser;
  replies?: NovelComment[];
};
export type GetNovelCommentsResponse = NovelComment[];
export type CreateNovelCommentBody = { text: string; parentId?: string };
export type CreateNovelCommentResponse = NovelComment;
