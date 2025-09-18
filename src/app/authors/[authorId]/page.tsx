import { NovelsProvider } from "@/novels/providers/NovelsProvider";
import AuthorPageClient from "./AuthorPageClient";
import type { Metadata } from "next";
import prisma from "@/utils/db";
import { JsonLd } from "@/app/components/JsonLd";
import { absoluteUrl } from "@/utils/site";

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ authorId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { authorId } = await params;
  const author = await prisma.author.findUnique({ where: { id: authorId }, select: { name: true, description: true } });
  const url = absoluteUrl(`/authors/${authorId}`);
  const jsonLd = author
    ? {
        "@context": "https://schema.org",
        "@type": "Person",
        name: author.name,
        description: author.description ?? undefined,
        url,
      }
    : undefined;
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
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <NovelsProvider authorId={authorId} sort={sortParam} search={searchParam} page={pageParam} pageSize={pageSizeParam}>
        <AuthorPageClient />
      </NovelsProvider>
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ authorId: string }> }): Promise<Metadata> {
  const { authorId } = await params;
  const author = await prisma.author.findUnique({
    where: { id: authorId },
    select: { name: true, description: true },
  });
  if (!author) {
    return { title: "Author not found", robots: { index: false, follow: true } };
  }
  return {
    title: author.name,
    description: author.description ?? undefined,
    alternates: { canonical: `/authors/${authorId}` },
    openGraph: {
      title: author.name,
      description: author.description ?? undefined,
      type: "profile",
    },
  };
}
