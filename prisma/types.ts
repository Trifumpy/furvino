import { Novel } from "@/novels/types";
import { Author } from "@/users/types";

export type AuthorForCreate = Author;
export type NovelForCreate = Omit<Novel, 'comments' | 'stats' | 'ratingsSummary' | 'author'> & {
  authorId: string;
};
