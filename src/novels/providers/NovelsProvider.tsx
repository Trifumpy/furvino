import { PropsWithChildren } from "react";
import { Novel } from "../types";
import { ClientNovelsProvider } from "./ClientNovelsProvider";

export async function NovelsProvider({ children }: PropsWithChildren) {
  // Server Fetch logic goes here
  const novels: Novel[] = [];

  return (
    <ClientNovelsProvider novels={novels}>{children}</ClientNovelsProvider>
  );
}
