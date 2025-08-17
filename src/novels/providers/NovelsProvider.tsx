import { PropsWithChildren } from "react";
import { GetNovelsQParams, ListedNovel } from "@/contracts/novels";
import { ClientNovelsProvider } from "./ClientNovelsProvider";
import { Registry } from "@/utils";

type Props = PropsWithChildren<GetNovelsQParams>;

export async function NovelsProvider({
  children,
  authorId,
  search,
  tags,
  sort,
}: Props) {
  const { novels } = Registry.get();

  let allNovels: ListedNovel[] = [];
  try {
    allNovels = await novels.getNovels({ authorId, search, tags, sort });
  } catch (error) {
    console.error("Failed to fetch novels:", error);
  }

  return (
    <ClientNovelsProvider novels={allNovels}>{children}</ClientNovelsProvider>
  );
}
