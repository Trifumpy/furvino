import { Novel } from "@/novels/types";
import { Author } from "@/users/types";

export type AuthorForCreate = Omit<Author, 'user'> & {
  userId?: string; // Optional userId for association
};
export type NovelForCreate = Omit<Novel, 'comments' | 'stats' | 'ratingsSummary' | 'author'> & {
  authorId: string;
};
