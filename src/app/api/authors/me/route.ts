import { getOrCreateUserByExternalId } from "../../users";
import { ensureClerkId, revalidateTags, validateRequestBody, wrapRoute } from "../../utils";
import { createAuthorSchema, updateAuthorSchema } from "@/contracts/users";
import { NextResponse } from "next/server";
import { enrichAuthorWithUser, getAuthor, sanitizeAuthor } from "../utils";
import prisma from "@/utils/db";
import { linkAuthor } from "../[authorId]/link/utils";
import { Author } from "@/generated/prisma";
import { NotFoundError } from "../../errors";
import { authorTags } from "@/utils";

export const GET = wrapRoute<Record<string, never>>(async (_req, _ctx) => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);

  if (!user.authorId) {
    throw new NotFoundError("User does not have an author profile");
  }

  const result = await getAuthor(user.authorId);
  const enrichedAuthor = enrichAuthorWithUser(result, user);
  
  return NextResponse.json(sanitizeAuthor(enrichedAuthor), { status: 200 });
});

export const PUT = wrapRoute<Record<string, never>>(async (request, _ctx) => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);

  const authorId = user.authorId;
  let author: Author;
  let created = false;

  if (!authorId) {
    const data = await validateRequestBody(request, createAuthorSchema);
    author = await prisma.author.create({ data });
    await linkAuthor(author.id, user.id);
    created = true;
  } else {
    const data = await validateRequestBody(request, updateAuthorSchema);
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
