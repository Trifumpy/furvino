import { GetAuthorsQueryParams, ListedAuthor, PublicAuthor } from "@/contracts/users";
import { ExternalSite } from "@/contracts/novels";
import { Author, Prisma, User } from "@/generated/prisma";
import prisma from "@/utils/db";
import { sanitizeUser } from "../users";
import { NotFoundError } from "../errors";

export type GetAuthorOptions = GetAuthorsQueryParams;
export type AuthorWithUser = Author & { user?: User | null };

export async function getAuthors(
  options: GetAuthorOptions
): Promise<AuthorWithUser[]> {
  const authors = await prisma.author.findMany({
    where: {
      name: {
        contains: options.search || "",
        mode: "insensitive",
      },
    },
    include: { user: true },
  });

  return authors;
}

export async function getAuthor(authorId: string): Promise<AuthorWithUser> {
  const author = await prisma.author.findUnique({ where: { id: authorId }, include: { user: true } });

  if (!author) throw new NotFoundError("Author not found");

  return author;
}

export async function enrichAuthor(author: Author): Promise<ListedAuthor> {
  const user = await prisma.user.findUnique({
    where: { authorId: author.id },
  });

  return enrichAuthorWithUser(author, user);
}

export async function enrichAuthors(
  authors: Author[]
): Promise<ListedAuthor[]> {
  const users = await prisma.user.findMany({
    where: {
      authorId: {
        in: authors.map((author) => author.id),
      },
    },
  });

  const userMap = new Map(users.map((user) => [user.authorId, user]));

  return authors.map((author) => enrichAuthorWithUser(author, userMap.get(author.id) || null));
}

export function enrichAuthorWithUser(author: Author, user: User | null): ListedAuthor {
  const externalUrls = normalizeAuthorExternalUrls(author.externalUrls);
  return {
    id: author.id,
    name: author.name,
    externalUrls: externalUrls as Partial<Record<ExternalSite, string>> | undefined,
    description: author.description ?? null,
    user,
  };
}

export function enrichAuthorsWithUsers(
  authors: AuthorWithUser[]
): ListedAuthor[] {
  return authors.map((author) => enrichAuthorWithUser(author, author.user || null));
}

export function sanitizeAuthor(author: ListedAuthor): PublicAuthor {
  const user = author.user ? sanitizeUser(author.user) : null;
  return {
    id: author.id,
    name: author.name,
    externalUrls: author.externalUrls,
    description: author.description ?? null,
    user,
  };
}

export function normalizeAuthorExternalUrls(raw: Prisma.JsonValue | null | undefined):
  | Partial<Record<ExternalSite, string>>
  | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const result: Partial<Record<ExternalSite, string>> = {};
  for (const [k, v] of Object.entries(raw)) result[k as ExternalSite] = String(v);
  return result;
}
