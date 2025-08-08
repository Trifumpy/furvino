import { Author, User } from "@/generated/prisma";
import z from "zod";

export const authorSchema = z.object({
  id: z.string().min(1, "ID cannot be an empty string").optional(),
  name: z.string().min(1, "Name is required"),
})
export type AuthorSchema = z.infer<typeof authorSchema>;

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

export type GetUserOptions = {
  includeDeleted?: boolean;
  search?: string;
}
export type GetUsersQParams = GetUserOptions;
export type GetUsersResponse = PublicUser[];

export type GetMeResponse = ListedUser;
