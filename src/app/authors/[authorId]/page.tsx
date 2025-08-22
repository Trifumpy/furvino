import { NovelsProvider } from "@/novels/providers/NovelsProvider";
import AuthorPageClient from "./AuthorPageClient";

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ authorId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { authorId } = await params;
  const sp = await searchParams;

  const SORT_VALUES = [
    "newest",
    "oldest",
    "lastUpdated",
    "mostViewed",
    "leastViewed",
    "mostRatings",
    "highestRating",
    "lowestRating",
    "mostDiscussed",
    "titleAsc",
    "titleDesc",
  ] as const;
  type SortValue = (typeof SORT_VALUES)[number];
  const isSortValue = (v: unknown): v is SortValue =>
    typeof v === "string" && (SORT_VALUES as readonly string[]).includes(v);
  const rawSort = typeof sp?.sort === "string" ? sp.sort : undefined;
  const sortParam: SortValue | undefined =
    rawSort && isSortValue(rawSort) ? rawSort : undefined;

  const pageParam = typeof sp?.page === "string" ? Number(sp.page) : undefined;
  const pageSizeParam = typeof sp?.pageSize === "string" ? Number(sp.pageSize) : undefined;
  const searchParam = typeof sp?.q === "string" ? (sp.q as string) : undefined;

  return (
    <NovelsProvider authorId={authorId} sort={sortParam} search={searchParam} page={pageParam} pageSize={pageSizeParam}>
      <AuthorPageClient />
    </NovelsProvider>
  );
}
