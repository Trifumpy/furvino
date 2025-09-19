import { SETTINGS } from "@/app/api/settings";
import { NextParams } from "@/app/types";
import { NovelDetailsPage } from "@/novels/pages";
import type { Metadata } from "next";
import prisma from "@/utils/db";
import { JsonLd } from "@/app/components/JsonLd";
import { absoluteUrl } from "@/utils/site";

export default async function Page({ params }: NextParams<{ novelId: string }>) {
  const { novelId } = await params;
  // Data fetching is handled in NovelProvider/layout
  return <NovelDetailsPage />;
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
