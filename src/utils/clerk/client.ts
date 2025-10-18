import { clerkClient as rawClerkClient } from "@clerk/nextjs/server";

type MaybeFn<T> = (() => Promise<T>) | T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractClient<T> = T extends (...args: any[]) => Promise<infer R>
  ? R
  : T;

let globalClerkClient: ExtractClient<typeof rawClerkClient> | null = null;

export async function getClerkClient() {
  if (globalClerkClient) {
    return globalClerkClient;
  }

  const maybeFn = rawClerkClient as MaybeFn<ExtractClient<typeof rawClerkClient>>;
  const resolved = typeof maybeFn === "function"
    ? await (maybeFn as () => Promise<ExtractClient<typeof rawClerkClient>> )()
    : (maybeFn as ExtractClient<typeof rawClerkClient>);

  globalClerkClient = resolved;
  return globalClerkClient;
}
