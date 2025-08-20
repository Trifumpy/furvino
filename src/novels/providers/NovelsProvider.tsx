import { PropsWithChildren } from "react";
import { GetNovelsQParams, ListedNovel } from "@/contracts/novels";
import { ClientNovelsProvider } from "./ClientNovelsProvider";
import { getAllNovels } from "@/app/api/novels/utils";

type Props = PropsWithChildren<GetNovelsQParams>;

export async function NovelsProvider({
  children,
  authorId,
  search,
  tags,
  sort,
}: Props) {
  let allNovels: ListedNovel[] = [];
  try {
    allNovels = await getAllNovels({ authorId, search, tags, sort });
  } catch (error) {
    console.error("Failed to fetch novels:", error);
  }

  return (
    <ClientNovelsProvider novels={allNovels}>{children}</ClientNovelsProvider>
  );
}
