import { PropsWithChildren } from "react";
import { Novel } from "../types";
import { ClientNovelsProvider } from "./ClientNovelsProvider";

export async function NovelsProvider({ children }: PropsWithChildren) {
  const novels: Novel[] = await fetch("http://localhost:3000/api/novels").then(
    (res) => res.json()
  );

  return (
    <ClientNovelsProvider novels={novels}>{children}</ClientNovelsProvider>
  );
}
