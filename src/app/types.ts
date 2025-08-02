export type Novel = {
  id: string;
  title: string;
  author?: string;
  externalUrl?: string;
  magnetUrl?: string;
  description?: string;
  snippet?: string;
  tags: string[];
  comments: Comment[];
  thumbnailUrl?: string;
}

export type Comment = {
  authorId: string;
  text: string;
}

export type UserRating = {
  userId: string;
  value: number;
}

export type Stats = {
  downloads: number;
}

export type User = {
  id: string;
  name: string;
  email?: string;
}
