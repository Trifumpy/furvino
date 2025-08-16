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
  if (!source || (!source.isPublic && source.userId !== user.id)) {
    throw new NotFoundError("Collection not found");
  }

  const duplicated = await prisma.$transaction(async (tx) => {
    const created = await tx.collection.create({
      data: {
        userId: user.id,
        name: source.name,
        description: source.description,
        isPublic: false,
      },
    });

    const items = await tx.collectionItem.findMany({ where: { collectionId } });
    if (items.length > 0) {
      await tx.collectionItem.createMany({
        data: items.map((i) => ({ collectionId: created.id, novelId: i.novelId })),
        skipDuplicates: true,
      });
    }
    return created;
  });

  return NextResponse.json({ id: duplicated.id }, { status: 201 });
});


