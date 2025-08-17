import { PropsWithChildren } from "react";
import { ListedNovel } from "@/contracts/novels";
import { ClientNovelProvider } from "./ClientNovelProvider";
import { HttpServiceError, Registry } from "@/utils";
import { ErrorPage } from "@/generic/pages";

type Props = PropsWithChildren<{
  novelId: string;
}>;

export async function NovelProvider({ novelId, children }: Props) {
  const { novels } = Registry.get();

  try {
    const novel: ListedNovel = await novels.getNovelById(novelId);
    return <ClientNovelProvider novel={novel}>{children}</ClientNovelProvider>;
  } catch (error) {
    const status = error instanceof HttpServiceError ? error.status : 500;
    return (
      <ErrorPage
        message={(error as Error)?.message ?? "Unknown error"}
        statusCode={status}
      />
    );
  }
}
