import {
  GalleryItem as PrismaGalleryItem,
  Novel,
  Prisma,
} from "@/generated/prisma";
import prisma from "@/utils/db";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors";
import { checkIfUserIsAdmin, ensureClerkId, validateSchema } from "../utils";
import {
  NovelSchema,
  novelSchema,
  ExternalSite,
  ListedNovel,
  Platform,
  GetNovelsQParams,
  FullNovel,
  GalleryItem,
  GetNovelsResponse,
  MAX_SNIPPET_LENGTH,
} from "@/contracts/novels";
import { getUserByExternalId } from "../users";
import { deleteStackFolder } from "../files";
import { trimString } from "@/utils";

type PrismaNovelWithAuthor = Novel & {
  author?: { id: string; name: string } | null;
};
type PrismaNovelWithAuthorAndThumbnails = PrismaNovelWithAuthor & {
  galleryItems: Omit<PrismaGalleryItem, "novelId">[];
};

export async function getAllNovels(options: GetNovelsQParams): Promise<GetNovelsResponse> {
  const { authorId, tags, search, sort } = options;
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(options.pageSize) || 48));

  // Tokenize search into words/tags (split by whitespace or commas) and require all tokens to match
  const searchTokens = typeof search === "string"
    ? search
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];

  const where: Prisma.NovelWhereInput = {
    authorId: authorId || undefined,
    ...(tags ? { tags: { hasEvery: tags } } : {}),
    ...(searchTokens.length
      ? {
          AND: searchTokens.map((token) => ({
            OR: [
              { title: { contains: token, mode: "insensitive" } },
              { author: { is: { name: { contains: token, mode: "insensitive" } } } },
              { tags: { has: token } },
            ],
          })),
        }
      : {}),
  };

  // Determine ordering
  const orderBy: Prisma.NovelOrderByWithRelationInput[] = [];
  let sortByComputedAverage: "highest" | "lowest" | null = null;
  switch (sort) {
    case "newest":
      orderBy.push({ createdAt: "desc" });
      break;
    case "oldest":
      orderBy.push({ createdAt: "asc" });
      break;
    case "lastUpdated":
      orderBy.push({ updatedAt: "desc" });
      break;
    case "mostViewed":
      orderBy.push({ views: "desc" });
      break;
    case "leastViewed":
      orderBy.push({ views: "asc" });
      break;
    case "titleAsc":
      orderBy.push({ title: "asc" });
      break;
    case "titleDesc":
      orderBy.push({ title: "desc" });
      break;
    // Future: implement based on aggregates once stored
    case "mostDiscussed":
      orderBy.push({ comments: { _count: "desc" } as unknown as never });
      break;
    case "highestRating":
      sortByComputedAverage = "highest";
      break;
    case "lowestRating":
      sortByComputedAverage = "lowest";
      break;
    case "mostRatings":
      orderBy.push({ ratings: { _count: "desc" } as unknown as never });
      break;
    case "mostDiscussed":
      orderBy.push({ comments: { _count: "desc" } as unknown as never });
      break;
    default:
      // Default to newest if not specified
      orderBy.push({ createdAt: "desc" });
      break;
  }

  // Count for pagination
  const total = await prisma.novel.count({ where });

  // For sorts that Prisma can handle natively, use skip/take.
  // For computed sorts (e.g., by average rating), fetch then sort in memory and slice.
  const requiresComputedSort = sort === "highestRating" || sort === "lowestRating" || sort === "mostRatings" || sort === "mostDiscussed";

  let novelsWithAuthors = requiresComputedSort
    ? await prisma.novel.findMany({
        where,
        orderBy: orderBy.length ? orderBy : undefined,
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: { select: { ratings: true } },
        },
      })
    : await prisma.novel.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: { select: { ratings: true } },
        },
      });

  const novelIds = novelsWithAuthors.map((n) => n.id);
  const ratings = await prisma.userRating.groupBy({
    by: ["novelId"],
    where: { novelId: { in: novelIds } },
    _avg: {
      plot: true,
      characters: true,
      backgroundsUi: true,
      characterArt: true,
      music: true,
      soundEffects: true,
      emotionalImpact: true,
    },
    _count: { novelId: true },
  });
  const novelIdToAvg: Record<string, number> = {};
  for (const r of ratings) {
    const parts = [
      r._avg.plot,
      r._avg.characters,
      r._avg.backgroundsUi,
      r._avg.characterArt,
      r._avg.music,
      r._avg.soundEffects,
      r._avg.emotionalImpact,
    ].filter((v): v is number => typeof v === "number" && v > 0);
    const avg = parts.length
      ? parts.reduce((a, b) => a + b, 0) / parts.length
      : 0;
    novelIdToAvg[r.novelId] = avg;
  }

  if (sortByComputedAverage) {
    novelsWithAuthors = novelsWithAuthors.sort((a, b) => {
      const av = novelIdToAvg[a.id] ?? 0;
      const bv = novelIdToAvg[b.id] ?? 0;
      return sortByComputedAverage === "highest" ? bv - av : av - bv;
    });
  }
  if (sort === "mostRatings") {
    const novelIdToCount: Record<string, number> = Object.fromEntries(
      ratings.map((r) => [r.novelId, r._count.novelId])
    );
    novelsWithAuthors = novelsWithAuthors.sort((a, b) => {
      const ac = novelIdToCount[a.id] ?? 0;
      const bc = novelIdToCount[b.id] ?? 0;
      return bc - ac;
    });
  }

  // If we fetched the full set (computed sort case), slice after sorting
  if (requiresComputedSort) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    novelsWithAuthors = novelsWithAuthors.slice(start, end);
  }

  const items = await Promise.all(
    novelsWithAuthors.map(async (n) => {
      const listed = await enrichNovelWithAuthor(n);
      listed.ratingsSummary.average = novelIdToAvg[n.id] ?? 0;
      listed.ratingsSummary.total =
        ratings.find((r) => r.novelId === n.id)?._count.novelId ?? 0;
      return listed;
    })
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getListedNovel(
  novelId: string
): Promise<ListedNovel | null> {
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  if (!novel) {
    return null;
  }
  return enrichNovelWithAuthor(novel);
}

export async function getFullNovel(novelId: string): Promise<FullNovel | null> {
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
      galleryItems: {
        select: {
          id: true,
          imageUrl: true,
          footer: true,
          createdAt: true,
        },
      },
    },
  });
  if (!novel) {
    return null;
  }
  return enrichNovelWithAuthorAndThumbnails(novel);
}

export async function getNovel(novelId: string): Promise<Novel | null> {
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
  });
  return novel;
}

export async function ensureGetNovel(novelId: string): Promise<Novel> {
  const novel = await getNovel(novelId);
  if (!novel) {
    throw new NotFoundError("Novel not found");
  }
  return novel;
}

export async function deleteNovel(novelId: string): Promise<void> {
  const novel = await ensureGetNovel(novelId);
  await prisma.novel.delete({
    where: { id: novel.id },
  });

  // Delete associated files if any
  await deleteStackFolder(`novels/${novel.id}`);
}

// ENRICHMENT

export async function enrichToListedNovel(data: Novel) {
  const author = await prisma.author.findUnique({
    where: { id: data.authorId },
  });

  if (!author) {
    throw new NotFoundError("Author not found");
  }

  return enrichNovelWithAuthor({
    ...data,
    snippet: data.snippet || (data.description ? trimString(data.description, MAX_SNIPPET_LENGTH) : null),
    author,
  });
}

export async function enrichToFullNovel(data: Novel): Promise<FullNovel> {
  const listedNovel = await enrichToListedNovel(data);

  const galleryItems = await prisma.galleryItem.findMany({
    where: { novelId: data.id },
  });

  return {
    ...listedNovel,
    description: data.description || null,
    bannerUrl: data.bannerUrl || null,
    galleryItems: galleryItems?.map(enrichGalleryItem) || [],
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
  };
}

export async function enrichNovelWithAuthor(
  {
    author,
    externalUrls,
    downloadUrls,
    createdAt,
    updatedAt,
    ...data
  }: PrismaNovelWithAuthor
): Promise<ListedNovel> {
  return {
    ...data,
    author: author || { id: data.authorId, name: "Unknown Author" },
    externalUrls: enrichUrls<ExternalSite>(externalUrls),
    downloadUrls: enrichUrls<Platform>(downloadUrls),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    ...(await getEnrichedNovelStats(data.id)),
  };
}

export async function enrichNovelWithAuthorAndThumbnails({
  galleryItems,
  ...data
}: PrismaNovelWithAuthorAndThumbnails): Promise<FullNovel> {
  return {
    ...(await enrichNovelWithAuthor(data)),
    galleryItems: galleryItems?.map(enrichGalleryItem) || [],
  };
}

function enrichUrls<TKey extends string = string>(
  raw: Prisma.JsonValue
): Partial<Record<TKey, string>> {
  if (typeof raw !== "object" || raw === null) {
    return {};
  }
  const result: Partial<Record<TKey, string>> = {};
  for (const [key, value] of Object.entries(raw)) {
    result[key as TKey] = String(value);
  }
  return result;
}

function enrichGalleryItem(
  data: Omit<PrismaGalleryItem, "novelId">
): GalleryItem {
  return {
    id: data.id,
    footer: data.footer || null,
    imageUrl: data.imageUrl,
    createdAt: data.createdAt.toISOString(),
  };
}

// Future: Fetch comments, stats, ratings summary
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getEnrichedNovelStats(novelId: string) {
  return {
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

// VALIDATION

export async function validateNovelData(data: unknown): Promise<NovelSchema> {
  const result = validateSchema(data, novelSchema);

  const authorExists = await prisma.author.findUnique({
    where: { id: result.authorId },
  });
  if (!authorExists) {
    throw new ValidationError("Author does not exist");
  }

  // If non-admin, enforce that the authorId belongs to the current user
  try {
    const { clerkId } = await ensureClerkId();
    const isAdmin = await checkIfUserIsAdmin(clerkId);
    if (!isAdmin) {
      const user = await getUserByExternalId(clerkId);
      if (!user || user.authorId !== result.authorId) {
        throw new ForbiddenError(
          "You can only create novels for your own author profile"
        );
      }
    }
  } catch {
    // allow server contexts that don't have auth (e.g., seed) to proceed
  }

  return result;
}

// PERMISSIONS

export async function checkIfUserCanUpdateNovel(
  clerkId: string,
  novel: Novel
): Promise<boolean> {
  if (await checkIfUserIsAdmin(clerkId)) {
    return true;
  }

  const authorId = novel.authorId;
  const user = await getUserByExternalId(clerkId);
  if (!user || user.authorId !== authorId) {
    return false;
  }

  return true;
}

export async function ensureCanUpdateNovel(novel: Novel): Promise<void> {
  const { clerkId } = await ensureClerkId();
  const canUpdate = await checkIfUserCanUpdateNovel(clerkId, novel);
  if (!canUpdate) {
    throw new ForbiddenError("You do not have permission to update this novel");
  }
}

export async function ensureCanUpdateNovelById(
  novelId: string
): Promise<Novel> {
  const novel = await ensureGetNovel(novelId);
  await ensureCanUpdateNovel(novel);
  return novel;
}
