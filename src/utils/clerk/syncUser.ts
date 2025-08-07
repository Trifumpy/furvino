import { User } from "@/generated/prisma";
import prisma from "../db";
import { getClerkClient } from "./client";

type UserSync = Omit<Partial<User>, 'clerkId'>;

export async function syncUser(clerkId: string, userData?: UserSync) {
  if (!userData) {
    const client = await getClerkClient();
    const clerkUser = await client.users.getUser(clerkId);

    userData = {
      email: clerkUser.emailAddresses[0]?.emailAddress,
      username: clerkUser.username ?? undefined,
      avatarUrl: clerkUser.imageUrl,
    }
  }

  const user = await prisma.user.upsert({
    where: { clerkId },
    update: userData!,
    create: {
      clerkId,
      ...userData,
      email: userData!.email || '',
      username: userData!.username || clerkId,
    },
  });

  return user;
}