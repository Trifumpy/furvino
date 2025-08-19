import { PropsWithChildren } from "react";
import { ListedNovel } from "@/contracts/novels";
import { ClientNovelProvider } from "./ClientNovelProvider";
import { ErrorPage } from "@/generic/pages";
import { getListedNovel } from "@/app/api/novels/utils";

type Props = PropsWithChildren<{
  novelId: string;
}>;

export async function NovelProvider({ novelId, children }: Props) {
  const novel = await getListedNovel(novelId);
  if (!novel) {
    return <ErrorPage statusCode={404} message="Novel not found" />;
  }

  return <ClientNovelProvider novel={novel as ListedNovel}>{children}</ClientNovelProvider>;
}
