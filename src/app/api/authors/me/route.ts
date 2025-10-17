import { getOrCreateUserByExternalId } from "../../users";
import { ensureClerkId, revalidateTags, validateRequestBody, wrapRoute } from "../../utils";
import { createAuthorSchema, updateAuthorSchema } from "@/contracts/users";
import { NextResponse } from "next/server";
import { enrichAuthorWithUser, getAuthor, sanitizeAuthor } from "../utils";
import prisma from "@/utils/db";
import { linkAuthor } from "../[authorId]/link/utils";
import { Author } from "@/generated/prisma";
import { ConflictError, NotFoundError, ForbiddenError } from "../../errors";
import { authorTags } from "@/utils";
import { deleteStackFolder } from "../../files";

export const GET = wrapRoute<Record<string, never>>(async () => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);

  if (!user.authorId) {
    throw new NotFoundError("User does not have an author profile");
  }

  const result = await getAuthor(user.authorId);
  const enrichedAuthor = enrichAuthorWithUser(result, user);
  
  return NextResponse.json(sanitizeAuthor(enrichedAuthor), { status: 200 });
});

export const PUT = wrapRoute<Record<string, never>>(async (request) => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);

  const authorId = user.authorId;
  let author: Author;
  let created = false;

  if (!authorId) {
    if (user.banAuthorCreation) {
      throw new ForbiddenError("Author creation is disabled for your account");
    }
    const data = await validateRequestBody(request, createAuthorSchema);
    // Prevent duplicate author names (case-insensitive) when creating self-serve
    const existing = await prisma.author.findFirst({
      where: { name: { equals: data.name, mode: "insensitive" } },
    });
    if (existing) {
      throw new ConflictError("An author with this name already exists");
    }
    author = await prisma.author.create({ data });
    await linkAuthor(author.id, user.id);
    created = true;
  } else {
    const data = await validateRequestBody(request, updateAuthorSchema);
    // Prevent duplicate author names (case-insensitive) when updating self-serve
    if (data.name) {
      const existing = await prisma.author.findFirst({
        where: {
          id: { not: authorId },
          name: { equals: data.name, mode: "insensitive" },
        },
      });
      if (existing) {
        throw new ConflictError("An author with this name already exists");
      }
    }
    author = await prisma.author.update({
      where: { id: authorId },
      data,
    });
  }

  const status = created ? 201 : 200;
  const enriched = enrichAuthorWithUser(author, user);
  revalidateTags(authorTags.author(enriched.id));
  revalidateTags(authorTags.list());
  return NextResponse.json(sanitizeAuthor(enriched), { status });
});

export const DELETE = wrapRoute<Record<string, never>>(async () => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);

  const authorId = user.authorId;
  if (!authorId) {
    // Idempotent: nothing to delete
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Clean up novel assets first
  const novels = await prisma.novel.findMany({ where: { authorId }, select: { id: true } });
  for (const n of novels) {
    await deleteStackFolder(`novels/${n.id}`).catch(() => undefined);
  }

  // Delete novels and author
  await prisma.novel.deleteMany({ where: { authorId } });
  await prisma.author.delete({ where: { id: authorId } });

  // Unlink user from author
  await prisma.user.update({ where: { id: user.id }, data: { authorId: null } });

  revalidateTags(authorTags.list());
  return NextResponse.json({ ok: true }, { status: 200 });
});
