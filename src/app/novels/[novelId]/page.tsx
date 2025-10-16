import { NextParams } from "@/app/types";
import { NovelDetailsPage } from "@/novels/pages";
import type { Metadata } from "next";
import prisma from "@/utils/db";

export default async function Page({ params }: NextParams<{ novelId: string }>) {
  await params;
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
  return {
    title: `${novel.title} | Furvino`,
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
