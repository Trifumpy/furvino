import { Author, User } from "@/generated/prisma";
import z from "zod";

export const authorSchema = z.object({
  id: z.string().min(1, "ID cannot be an empty string"),
  name: z.string().min(1, "Name is required"),
})
export type AuthorSchema = z.infer<typeof authorSchema>;

export const createAuthorSchema = authorSchema.omit({ id: true });
export type CreateAuthorSchema = z.infer<typeof createAuthorSchema>;
export const updateAuthorSchema = createAuthorSchema.partial();
export type UpdateAuthorSchema = z.infer<typeof updateAuthorSchema>;

export const linkAuthorSchema = z.object({
  userId: z.string().min(1, "User ID cannot be an empty string"),
})
export type LinkAuthorSchema = z.infer<typeof linkAuthorSchema>;

export const userSchema = z.object({
  id: z.string().min(1, "ID cannot be an empty string"),
  clerkId: z.string().min(1, "Clerk ID cannot be an empty string").optional(),
  email: z.email().optional().nullable(),
  username: z.string().min(1, "Name is required"),
  roles: z.array(z.string()).optional(),
  avatarUrl: z.url().optional().nullable(),
  bio: z.string().optional().nullable(),
  authorId: z.string().min(1, "Author ID cannot be an empty string").optional().nullable(),
})
export type UserSchema = z.infer<typeof userSchema>;
export type ListedUser = User & {
  author: Author | null;
}
export type PublicUser = Omit<User, "email" | "clerkId">;

export const getUserOptionsSchema = z.object({
  includeDeleted: z.boolean(),
  search: z.string(),
}).partial();
export type GetUserOptions = z.infer<typeof getUserOptionsSchema>;
export type GetUsersQParams = z.infer<typeof getUserOptionsSchema>;
export type GetUsersResponse = PublicUser[];

export type GetMeResponse = ListedUser;

export type ListedAuthor = AuthorSchema & {
  user?: User | null;
}
export type PublicAuthor = AuthorSchema & {
  user?: PublicUser | null;
}
export type GetAuthorParams = { authorId: string };
export type GetAuthorResponse = PublicAuthor;

export const getAuthorsQuerySchema = z.object({
  search: z.string(),
  includeDeleted: z.boolean(),
}).partial();
export type GetAuthorsQueryParams = z.infer<typeof getAuthorsQuerySchema>;
export type GetAuthorsResponse = PublicAuthor[];

export type CreateAuthorBody = Omit<AuthorSchema, "id">;
export type CreateAuthorResponse = ListedAuthor;

export type LinkAuthorParams = { authorId: string };
export type LinkAuthorBody = { userId: string };
export type LinkAuthorResponse = ListedAuthor;

export type UpdateAuthorBody = Partial<CreateAuthorBody>;
export type UpdateAuthorResponse = ListedAuthor;
