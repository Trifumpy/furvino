import { User } from "@/generated/prisma";
import prisma from "../db";
import { getClerkClient } from "./client";

type UserSync = Omit<Partial<User>, 'clerkId'>;

export async function syncUser(clerkId: string, userData?: UserSync) {
  if (!userData) {
    const client = await getClerkClient();
    const clerkUser = await client.users.getUser(clerkId);

    // Find the primary/verified email address
    const primaryEmail = clerkUser.emailAddresses?.find(
      (email) => email.verification?.status === "verified"
    ) || clerkUser.emailAddresses?.[0];

    userData = {
      email: primaryEmail?.emailAddress,
      username: clerkUser.username ?? undefined,
      avatarUrl: clerkUser.imageUrl,
    }
  }

  console.log(`Syncing user with Clerk ID: ${clerkId}`, userData);

  // Check if the email is already taken by another user
  if (userData?.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser && existingUser.clerkId !== clerkId) {
      console.warn(`Email ${userData.email} is already taken by another user. Skipping email update.`);
      // Remove email from update data to avoid unique constraint violation
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { email, ...updateDataWithoutEmail } = userData;
      userData = updateDataWithoutEmail;
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