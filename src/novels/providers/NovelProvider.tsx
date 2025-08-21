import { PropsWithChildren } from "react";
import { ClientNovelProvider } from "./ClientNovelProvider";
import { ErrorPage } from "@/generic/pages";
import { getFullNovel } from "@/app/api/novels/utils";

type Props = PropsWithChildren<{
  novelId: string;
}>;

export async function NovelProvider({ novelId, children }: Props) {
  const novel = await getFullNovel(novelId);
  if (!novel) {
    return <ErrorPage statusCode={404} message="Novel not found" />;
  }

  return <ClientNovelProvider novel={novel}>{children}</ClientNovelProvider>;
}
