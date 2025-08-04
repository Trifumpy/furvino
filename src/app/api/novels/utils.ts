import { Prisma } from "@/generated/prisma";
import { ExternalSite, Novel, Platform } from "@/novels/types";
import prisma from "@/utils/db";

type PrismaNovelWithAuthor = Prisma.PromiseReturnType<typeof prisma.novel.findUnique> & {
  author?: { id: string; name: string } | null;
};

export async function getNovels(): Promise<Novel[]> { 
  const novelsWithAuthors = await prisma.novel.findMany({
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Map the Prisma result to match the Novel type if needed
  return novelsWithAuthors.map(postProcessNovelData);
}

export async function getNovel(novelId: string): Promise<Novel | null> {
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      }
    },
  });
  if (!novel) {
    return null;
  }
  return postProcessNovelData(novel);
}

function postProcessNovelData(data: PrismaNovelWithAuthor): Novel {
  return {
    ...data,
    author: data.author || { id: data.authorId, name: "Unknown Author" },
    externalUrls: postProcessUrls<ExternalSite>(data.externalUrls),
    magnetUrls: postProcessUrls<Platform>(data.magnetUrls),
    comments: {
      total: 0,
      recent: [],
    },
    stats: {
      downloads: 0,
      favorites: 0,
      views: 0,
    },
    ratingsSummary: {
      total: 0,
      average: 0,
      recent: [],
    },
  };
}

function postProcessUrls<TKey extends string = string>(raw: Prisma.JsonValue): Partial<Record<TKey, string>> {
  if (typeof raw !== 'object' || raw === null) {
    return {};
  }
  const result: Partial<Record<TKey, string>> = {};
  for (const [key, value] of Object.entries(raw)) {
    result[key as TKey] = String(value);
  }
  return result;
}
