import { NextParams } from "@/app/types";
import { EditNovelPage } from "@/novels/pages";
import { NovelProvider } from "@/novels/providers/NovelProvider";

type PageProps = NextParams<{
  novelId: string;
}>;

export default async function Page({ params }: PageProps) {
  const { novelId } = await params;

  return (
    <NovelProvider novelId={novelId}>
      <EditNovelPage />
    </NovelProvider>
  );
}
