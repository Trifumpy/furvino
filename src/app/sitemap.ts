import type { MetadataRoute } from "next";
import prisma from "@/utils/db";
import { absoluteUrl } from "@/utils/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [novels, authors, collections] = await Promise.all([
    prisma.novel.findMany({ select: { id: true, updatedAt: true } }),
    prisma.author.findMany({ select: { id: true } }),
    prisma.collection.findMany({ select: { id: true, isPublic: true, updatedAt: true } }),
  ]);

  const pages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  for (const n of novels) {
    pages.push({
      url: absoluteUrl(`/novels/${n.id}`),
      lastModified: n.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const a of authors) {
    pages.push({
      url: absoluteUrl(`/authors/${a.id}`),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const c of collections) {
    if (!c.isPublic) continue;
    pages.push({
      url: absoluteUrl(`/collections/${c.id}`),
      lastModified: c.updatedAt,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  return pages;
}


