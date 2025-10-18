import { User } from "@/generated/prisma";
import { ClerkEvent } from "./types";
import { syncUser } from "@/utils/clerk";
import { markUserAsDeletedByClerkId } from "../../users";

export async function processEvent(event: ClerkEvent) {
  console.log(`Processing Clerk event: ${event.type}`, { id: event.data.id });

  if (event.type === "user.created" || event.type === "user.updated") {
    const data = event.data;

    // Find the primary/verified email address
    const primaryEmail = data.email_addresses?.find(
      (email) => email.verification?.status === "verified"
    ) || data.email_addresses?.[0];

    console.log(`Found primary email for user ${data.id}:`, primaryEmail?.email_address);

    const user: Partial<User> = {
      email: primaryEmail?.email_address || "",
      username: data.username || data.id,
      avatarUrl: data.image_url,
    }

    await syncUser(data.id, user);
  }

  if (event.type === "user.deleted") {
    const data = event.data;

    if (data.id) {
      await markUserAsDeletedByClerkId(data.id);
    }
  }
}
