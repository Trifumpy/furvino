import { GetUserOptions, PublicUser } from "@/contracts/users";
import { User } from "@/generated/prisma";
import { syncUser } from "@/utils/clerk";
import prisma from "@/utils/db";

export function getUser(userId: string, options?: GetUserOptions) {
  return prisma.user.findUnique({
    where: {
      id: userId,
      deletedAt: options?.includeDeleted ? undefined : null,
    },
  });
}

export function getUserByExternalId(
  externalId: string,
  options?: GetUserOptions
) {
  return prisma.user.findUnique({
    where: {
      clerkId: externalId,
      deletedAt: options?.includeDeleted ? undefined : null,
    },
  });
}

export async function getOrCreateUserByExternalId(externalId: string) {
  const user = await getUserByExternalId(externalId);
  if (user) {
    return user;
  }

  return await syncUser(externalId);
}

export function markUserAsDeleted(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });
}

export function getAllUsers(options?: GetUserOptions) {
  return prisma.user.findMany({
    where: {
      deletedAt: options?.includeDeleted ? undefined : null,
      username: { 
        contains: options?.search || "", 
        mode: "insensitive" 
      },
    },
  });
}

// ENRICHMENT

export async function enrichUser(user: User) {
  const author = user.authorId
    ? await prisma.author.findUnique({ where: { id: user.authorId } })
    : null;

  return {
    ...user,
    author,
  };
}

export function sanitizeUser(user: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { email, clerkId, ...sanitizedUser } = user;
  return sanitizedUser;
}
