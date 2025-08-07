import prisma from "@/utils/db";

type GetUserOptions = {
  includeDeleted?: boolean;
}

export function getUser(userId: string, options?: GetUserOptions) {
  return prisma.user.findUnique({
    where: { 
      id: userId, 
      deletedAt: options?.includeDeleted ? undefined : null 
    },
  })
}

export function getUserByExternalId(externalId: string, options?: GetUserOptions) {
  return prisma.user.findUnique({
    where: { 
      clerkId: externalId, 
      deletedAt: options?.includeDeleted ? undefined : null 
    },
  });
}

export function markUserAsDeleted(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });
}
