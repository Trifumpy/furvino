import { User } from "@/generated/prisma";
import { ClerkEvent } from "./types";
import { syncUser } from "@/utils/clerk";
import { markUserAsDeletedByClerkId } from "../../users";

export async function processEvent(event: ClerkEvent) {
  if (event.type === "user.created" || event.type === "user.updated") {
    const data = event.data;
    const user: Partial<User> = {
      email: data.email_addresses[0]?.email_address || "",
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
