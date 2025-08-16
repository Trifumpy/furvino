import z from "zod";

export const collectionSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});
export type CollectionSchema = z.infer<typeof collectionSchema>;

export const createCollectionSchema = collectionSchema
  .pick({ name: true, description: true })
  .extend({
    name: z.string().min(1, "Name is required").max(100),
  });
export type CreateCollectionBody = z.infer<typeof createCollectionSchema>;
export type CreateCollectionResponse = ListedCollection;

export const addCollectionItemSchema = z.object({
  novelId: z.string().min(1, "Novel ID is required"),
});
export type AddCollectionItemBody = z.infer<typeof addCollectionItemSchema>;
export type AddCollectionItemResponse = ListedCollection;

export type ListedCollection = {
  id: string;
  name: string;
  description?: string | null;
  itemsCount: number;
  isPublic?: boolean;
  isFollowing?: boolean;
};

export type GetMyCollectionsResponse = ListedCollection[];

import { ListedNovel } from "./novels";
export type GetCollectionParams = { collectionId: string };
export type GetCollectionResponse = {
  id: string;
  name: string;
  description?: string | null;
  novels: ListedNovel[];
  isPublic?: boolean;
  isOwner?: boolean;
  isFollowing?: boolean;
};

export type DuplicateCollectionResponse = ListedCollection;
export type FollowCollectionResponse = ListedCollection;

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isPublic: z.boolean().optional(),
});
export type UpdateCollectionBody = z.infer<typeof updateCollectionSchema>;
export type UpdateCollectionResponse = ListedCollection;


