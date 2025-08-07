import { clerkClient } from "@clerk/nextjs/server";

let globalClerkClient: Awaited<ReturnType<typeof clerkClient>> | null = null;

export async function getClerkClient() {
  if (globalClerkClient) {
    return globalClerkClient;
  }

  globalClerkClient = await clerkClient();
  return globalClerkClient;
}
