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
      (email: { verification?: { status?: string } | null }) => email.verification?.status === "verified"
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

  // Check if the username is already taken by another user
  if (userData?.username) {
    const existingUsernameOwner = await prisma.user.findUnique({
      where: { username: userData.username },
    });

    if (existingUsernameOwner && existingUsernameOwner.clerkId !== clerkId) {
      console.warn(`Username ${userData.username} is already taken by another user. Skipping username update.`);
      // Remove username from update data to avoid unique constraint violation
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { username, ...updateDataWithoutUsername } = userData;
      userData = updateDataWithoutUsername;
    }
  }

  try {
    // Only include defined fields in update to avoid errors with empty objects
    const updateData = Object.fromEntries(
      Object.entries(userData!).filter(([_, v]) => v !== undefined)
    );

    const user = await prisma.user.upsert({
      where: { clerkId },
      update: Object.keys(updateData).length > 0 ? updateData : { updatedAt: new Date() },
      create: {
        clerkId,
        ...userData,
        // Use placeholder if missing to satisfy unique constraint; will be updated later
        email: userData!.email || `${clerkId}@placeholder.local`,
        username: userData!.username || clerkId,
      },
    });

    console.log(`User synced successfully:`, { clerkId, id: user.id, email: user.email });
    return user;
  } catch (err) {
    console.error(`Failed to sync user ${clerkId}:`, err);
    throw err;
  }
}