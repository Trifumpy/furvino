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
  page,
  pageSize,
}: Props) {
  let allNovels: ListedNovel[] = [];
  let total = 0;
  let totalPages = 1;
  let effectivePage = page ?? 1;
  let effectivePageSize = pageSize ?? 20;
  try {
    const result = await getAllNovels({ authorId, search, tags, sort, page, pageSize });
    allNovels = result.items;
    total = result.total;
    totalPages = result.totalPages;
    effectivePage = result.page;
    effectivePageSize = result.pageSize;
  } catch (error) {
    console.error("Failed to fetch novels:", error);
  }

  return (
    <ClientNovelsProvider novels={allNovels} total={total} page={effectivePage} pageSize={effectivePageSize} totalPages={totalPages}>{children}</ClientNovelsProvider>
  );
}
