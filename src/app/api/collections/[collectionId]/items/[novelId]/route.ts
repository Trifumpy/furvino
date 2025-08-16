import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { ensureClerkId, wrapRoute } from "@/app/api/utils";
import { getOrCreateUserByExternalId } from "@/app/api/users";
import { NotFoundError } from "@/app/api/errors";
import { NextParams } from "@/app/types";

type Params = { collectionId: string; novelId: string };

export const DELETE = wrapRoute<Params>(async (_req, { params }: NextParams<Params>) => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);
  const { collectionId, novelId } = await params;

  const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!collection || collection.userId !== user.id) {
    throw new NotFoundError("Collection not found");
  }

  await prisma.collectionItem.deleteMany({
    where: { collectionId, novelId },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
});


