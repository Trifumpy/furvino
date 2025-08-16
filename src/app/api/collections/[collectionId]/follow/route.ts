import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { ensureClerkId, wrapRoute } from "@/app/api/utils";
import { getOrCreateUserByExternalId } from "@/app/api/users";
import { NotFoundError } from "@/app/api/errors";
import { NextParams } from "@/app/types";

type Params = { collectionId: string };

export const POST = wrapRoute<Params>(async (_req, { params }: NextParams<Params>) => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);
  const { collectionId } = await params;

  const source = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!source || !source.isPublic) {
    throw new NotFoundError("Collection not found");
  }

  await prisma.collectionFollow.upsert({
    where: { collectionId_userId: { collectionId, userId: user.id } },
    update: {},
    create: { collectionId, userId: user.id },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
});

export const DELETE = wrapRoute<Params>(async (_req, { params }: NextParams<Params>) => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);
  const { collectionId } = await params;

  await prisma.collectionFollow.deleteMany({ where: { collectionId, userId: user.id } });
  return NextResponse.json({ ok: true }, { status: 200 });
});


