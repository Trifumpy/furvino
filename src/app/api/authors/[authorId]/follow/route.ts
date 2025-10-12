import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { ensureClerkId, wrapRoute } from "@/app/api/utils";
import { getOrCreateUserByExternalId } from "@/app/api/users";
import { NotFoundError } from "@/app/api/errors";

export const POST = wrapRoute(async (_req, { params }: { params: Promise<{ authorId: string }> }) => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);
  const { authorId } = await params;

  const author = await prisma.author.findUnique({ where: { id: authorId } });
  if (!author) {
    throw new NotFoundError("Author not found");
  }

  await prisma.authorFollow.upsert({
    where: { authorId_userId: { authorId, userId: user.id } },
    update: {},
    create: { authorId, userId: user.id },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
});

export const DELETE = wrapRoute(async (_req, { params }: { params: Promise<{ authorId: string }> }) => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);
  const { authorId } = await params;

  await prisma.authorFollow.deleteMany({ where: { authorId, userId: user.id } });
  return NextResponse.json({ ok: true }, { status: 200 });
});
