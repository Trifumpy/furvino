import { BrowsePage } from "../../novels/pages";
import { SearchProvider } from "@/novels/providers/SearchProvider";
import { NovelsProvider } from "@/novels/providers/NovelsProvider";

export default async function App({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
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
    typeof v === 'string' && (SORT_VALUES as readonly string[]).includes(v);
  const rawSort = typeof sp?.sort === 'string' ? sp.sort : undefined;
  const sortParam: SortValue | undefined = rawSort && isSortValue(rawSort) ? rawSort : undefined;
  const pageParam = typeof sp?.page === 'string' ? Number(sp.page) : undefined;
  const pageSizeParam = typeof sp?.pageSize === 'string' ? Number(sp.pageSize) : undefined;
  const searchParam = typeof sp?.q === 'string' ? (sp.q as string) : undefined;

  return (
    <NovelsProvider sort={sortParam} search={searchParam} page={pageParam} pageSize={pageSizeParam}>
      <SearchProvider>
        <BrowsePage />
      </SearchProvider>
    </NovelsProvider>
  );
}
