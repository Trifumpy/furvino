import { clerkClient } from "@clerk/nextjs/server";

// clerkClient is already a client instance. No invocation is needed.
let globalClerkClient: typeof clerkClient | null = null;

export async function getClerkClient() {
  if (globalClerkClient) {
    return globalClerkClient;
  }

  globalClerkClient = clerkClient;
  return globalClerkClient;
}
