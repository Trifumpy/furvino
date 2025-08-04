import { NextParams } from "@/app/types";
import { NovelDetailsPage } from "@/novels/pages";
import { NovelProvider } from "@/novels/providers";

type NovelPageProps = NextParams<{
  novelId: string;
}>;

export default async function Page({ params }: NovelPageProps) {
  const { novelId } = await params;
  return (
    <NovelProvider novelId={novelId}>
      <NovelDetailsPage />
    </NovelProvider>
  );
}
