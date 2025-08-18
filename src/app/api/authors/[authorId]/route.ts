import { NextResponse } from "next/server";
import { getAuthor, enrichAuthorWithUser, sanitizeAuthor } from "../utils";
import { ensureAdmin, revalidateTags, validateRequestBody, wrapRoute } from "../../utils";
import prisma from "@/utils/db";
import { updateAuthorSchema } from "@/contracts/users";
import { authorTags, novelTags } from "@/utils";
import { deleteStackFolder } from "../../files";

export const GET = wrapRoute<{ authorId: string }>(
  async (req, { params }) => {
    const { authorId } = await params;

    const author = await getAuthor(authorId);

    const enriched = enrichAuthorWithUser(author, author.user ?? null);
    return NextResponse.json(sanitizeAuthor(enriched));
  }
);

export const PUT = wrapRoute<{ authorId: string }>(async (req, { params }) => {
  await ensureAdmin();
  const { authorId } = await params;
  const data = await validateRequestBody(req, updateAuthorSchema);

  const author = await prisma.author.update({ where: { id: authorId }, data, include: { user: true } });
  const enriched = enrichAuthorWithUser(author, author.user ?? null);
  revalidateTags(authorTags.author(authorId));
  revalidateTags(authorTags.list());
  return NextResponse.json(sanitizeAuthor(enriched));
});

export const DELETE = wrapRoute<{ authorId: string }>(async (_req, { params }) => {
  await ensureAdmin();
  const { authorId } = await params;

  // Clean up novel assets first
  const novels = await prisma.novel.findMany({ where: { authorId }, select: { id: true } });
  for (const n of novels) {
    await deleteStackFolder(`novels/${n.id}`).catch(() => undefined);
  }
  // Delete all novels for this author
  await prisma.novel.deleteMany({ where: { authorId } });
  // Delete the author record
  await prisma.author.delete({ where: { id: authorId } });
  revalidateTags(authorTags.list());
  revalidateTags(novelTags.list());
  return NextResponse.json({ ok: true });
});
