import type { Metadata, ResolvingMetadata } from "next";
import { PropsWithChildren } from "react";
import prisma from "@/utils/db";

export default function CollectionLayout({ children }: PropsWithChildren) {
  return children;
}

export async function generateMetadata(
  { params }: { params: Promise<{ collectionId: string }> },
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { collectionId } = await params;
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { name: true, description: true, isPublic: true, updatedAt: true },
  });

  if (!collection) {
    return { title: "Collection not found", robots: { index: false, follow: true } };
  }

  const base: Metadata = {
    title: collection.name || "Collection",
    description: collection.description ?? undefined,
    alternates: { canonical: `/collections/${collectionId}` },
  };

  if (!collection.isPublic) {
    return { ...base, robots: { index: false, follow: false, nocache: true } };
  }

  return base;
}

