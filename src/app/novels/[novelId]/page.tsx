import { NovelDetailsPage } from "@/novels/pages";
import type { Metadata } from "next";
import prisma from "@/utils/db";
import { JsonLd } from "@/app/components/JsonLd";
import { absoluteUrl } from "@/utils/site";

export default async function Page({ params }: { params: Promise<{ novelId: string }> }) {
  const { novelId } = await params;
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { title: true, snippet: true, thumbnailUrl: true },
  });
  const imageUrl = novel?.thumbnailUrl || undefined;
  const url = absoluteUrl(`/novels/${novelId}`);
  const jsonLd = novel
    ? {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: novel.title,
        description: novel.snippet ?? undefined,
        url,
        image: imageUrl,
      }
    : undefined;
  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
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
    title: novel.title,
    description: novel.snippet ?? undefined,
    alternates: { canonical: `/novels/${novelId}` },
    openGraph: {
      title: novel.title,
      description: novel.snippet ?? undefined,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
      type: "article",
    },
  };
}
