import { Author } from "@/users/types";

export type Novel = {
  id: string;
  title: string;
  author: Author;
  externalUrls?: Record<ExternalSite, string>;
  magnetUrls?: Record<Platform, string>;
  description?: string;
  snippet?: string;
  thumbnailUrl?: string;
  tags: string[];
  comments: CommentsSummary;
  stats: Stats;
  ratingsSummary: RatingsSummary;
}

export type ExternalSite = "discord" | "patreon" | "x" | "itch";
export type Platform = "windows" | "mac" | "linux" | "android" | "other";

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

export type User = {
  id: string;
  name: string;
  email?: string;
}
