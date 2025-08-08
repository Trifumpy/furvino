import { PropsWithChildren } from "react";
import { ListedNovel } from "@/contracts/novels";
import { ClientNovelsProvider } from "./ClientNovelsProvider";
import { Registry } from "@/utils";

export async function NovelsProvider({ children }: PropsWithChildren) {
  const { novels } = Registry.get();

  let allNovels: ListedNovel[] = [];
  try {
    allNovels = await novels.getNovels();
  } catch (error) {
    console.error("Failed to fetch novels:", error);
  }

  return (
    <ClientNovelsProvider novels={allNovels}>{children}</ClientNovelsProvider>
  );
}
