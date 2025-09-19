import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { ensureClerkId, validateRequestBody, wrapRoute } from "@/app/api/utils";
import { getOrCreateUserByExternalId } from "@/app/api/users";
import { NotFoundError } from "@/app/api/errors";
import { AddCollectionItemBody, AddCollectionItemResponse, addCollectionItemSchema } from "@/contracts/collections";
import { NextParams } from "@/app/types";

type Params = { collectionId: string };

function toListed(collection: { id: string; name: string; description: string | null; _count: { items: number } }) {
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    itemsCount: collection._count.items,
  } satisfies AddCollectionItemResponse;
}

export const POST = wrapRoute<Params>(async (req, { params }: NextParams<Params>) => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);
  const { collectionId } = await params;
  const body = await validateRequestBody<AddCollectionItemBody>(req, addCollectionItemSchema);

  const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!collection || collection.userId !== user.id) {
    throw new NotFoundError("Collection not found");
  }

  await prisma.collectionItem.upsert({
    where: {
      collectionId_novelId: {
        collectionId,
        novelId: body.novelId,
      },
    },
    update: {},
    create: {
      collectionId,
      novelId: body.novelId,
    },
  });

  const updated = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: { _count: { select: { items: true } } },
  });
  if (!updated) {
    throw new NotFoundError("Collection not found");
  }

  const result = toListed(updated);
  return NextResponse.json(result, { status: 200 });
});


