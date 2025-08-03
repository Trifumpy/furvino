import { NovelDetailsPage } from "@/novels/pages";
import { NovelProvider } from "@/novels/providers";

type Params = {
  novelId: string;
};
type NovelPageProps = {
  params: Params;
};

export default async function Page({ params }: NovelPageProps) {
  const { novelId } = await params;
  return (
    <NovelProvider novelId={novelId}>
      <NovelDetailsPage />
    </NovelProvider>
  );
}
