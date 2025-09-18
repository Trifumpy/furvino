import { NovelDetailsPage } from "@/novels/pages";
import type { Metadata } from "next";
import prisma from "@/utils/db";
import { JsonLd } from "@/app/components/JsonLd";
import { absoluteUrl } from "@/utils/site";

export default async function Page({ params }: { params: Promise<{ novelId: string }> }) {
  const { novelId } = await params;
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { title: true, snippet: true, thumbnailUrl: true, tags: true, author: { select: { name: true, id: true } } },
  });
  const imageUrl = novel?.thumbnailUrl || undefined;
  const url = absoluteUrl(`/novels/${novelId}`);
  const keywords = Array.isArray(novel?.tags)
    ? Array.from(new Set([...(novel?.tags ?? []), "furry visual novel", "FVN", "visual novel"]))
    : ["furry visual novel", "FVN", "visual novel"];
  const jsonLd = novel
    ? {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: novel.title,
        alternateName: [novel.title, `${novel.title} FVN`],
        genre: ["Visual Novel", "Furry"],
        description: novel.snippet ?? undefined,
        url,
        image: imageUrl,
        author: novel.author ? { "@type": "Person", name: novel.author.name, url: absoluteUrl(`/authors/${novel.author.id}`) } : undefined,
        keywords,
      }
    : undefined;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Novels", item: absoluteUrl("/") },
      novel ? { "@type": "ListItem", position: 3, name: novel.title, item: url } : undefined,
    ].filter(Boolean),
  } as const;
  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <JsonLd data={breadcrumb} />
      <NovelDetailsPage />
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ novelId: string }> }): Promise<Metadata> {
  const { novelId } = await params;
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { title: true, snippet: true, thumbnailUrl: true, updatedAt: true },
  });
  if (!novel) {
    return { title: "Novel not found", robots: { index: false, follow: true } };
  }
  const imageUrl = novel.thumbnailUrl || undefined;
  const url = absoluteUrl(`/novels/${novelId}`);
  return {
    title: `${novel.title} - Furry Visual Novel | Furvino`,
    description: novel.snippet ?? `Read ${novel.title}, a furry visual novel, on Furvino.`,
    alternates: { canonical: `/novels/${novelId}` },
    openGraph: {
      title: `${novel.title} - Furry Visual Novel`,
      description: novel.snippet ?? `Read ${novel.title}, a furry visual novel, on Furvino.`,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
      type: "article",
    },
  };
}
