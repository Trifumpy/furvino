import { Novel, Prisma } from "@/generated/prisma";
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
} from "@/contracts/novels";
import { getUserByExternalId } from "../users";

type PrismaNovelWithAuthor = Prisma.PromiseReturnType<
  typeof prisma.novel.findUnique
> & {
  author?: { id: string; name: string } | null;
};

export async function getAllNovels(options: GetNovelsQParams) {
  const { authorId, tags, search } = options;

  const where: Prisma.NovelWhereInput = {
    authorId: authorId || undefined,
    tags: tags ? { hasEvery: tags } : undefined,
    title: search ? { contains: search, mode: "insensitive" } : undefined,
  };

  const novelsWithAuthors = await prisma.novel.findMany({
    where,
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return novelsWithAuthors.map(enrichNovelWithAuthor);
}

export async function getListedNovel(novelId: string): Promise<ListedNovel | null> {
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

// ENRICHMENT

export async function enrichNovel(data: Novel) {
  const author = await prisma.author.findUnique({
    where: { id: data.authorId },
  });

  if (!author) {
    throw new NotFoundError("Author not found");
  }

  return enrichNovelWithAuthor({
    ...data,
    author
  });
}

export function enrichNovelWithAuthor(data: PrismaNovelWithAuthor): ListedNovel {
  return {
    ...data,
    author: data.author || { id: data.authorId, name: "Unknown Author" },
    externalUrls: enrichUrls<ExternalSite>(data.externalUrls),
    magnetUrls: enrichUrls<Platform>(data.magnetUrls),
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

// VALIDATION

export async function validateNovelData(data: unknown): Promise<NovelSchema> {
  const result = validateSchema(data, novelSchema);

  const authorExists = await prisma.author.findUnique({
    where: { id: result.authorId },
  });
  if (!authorExists) {
    throw new ValidationError("Author does not exist");
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

export async function ensureCanUpdateNovel(
  novel: Novel
): Promise<void> {
  const { clerkId } = await ensureClerkId();
  const canUpdate = await checkIfUserCanUpdateNovel(clerkId, novel);
  if (!canUpdate) {
    throw new ForbiddenError("You do not have permission to update this novel");
  }
}
