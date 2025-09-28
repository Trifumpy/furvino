import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { getOrCreateUserByExternalId } from "../users";
import { ensureClerkId, validateRequestBody, wrapRoute } from "../utils";
import {
  CreateCollectionBody,
  CreateCollectionResponse,
  GetMyCollectionsResponse,
  createCollectionSchema,
} from "@/contracts/collections";

function toListed(
  collection: { id: string; name: string; description: string | null; isPublic: boolean; _count: { items: number } },
  extras?: { isFollowing?: boolean }
) {
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isPublic: collection.isPublic,
    itemsCount: collection._count.items,
    isFollowing: extras?.isFollowing ?? false,
  } satisfies CreateCollectionResponse;
}

export const GET = wrapRoute(async () => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);

  const owned = await prisma.collection.findMany({
    where: { userId: user.id },
    include: { _count: { select: { items: true } } },
    orderBy: [{ updatedAt: "desc" }],
  });

  const follows = await prisma.collectionFollow.findMany({
    where: { userId: user.id },
    include: {
      collection: { include: { _count: { select: { items: true } } } },
    },
  });

  const ownedListed = owned.map((c) => toListed(c));
  const followedListed = follows
    .filter((f) => f.collection.userId !== user.id && f.collection.isPublic)
    .map((f) => toListed(f.collection, { isFollowing: true }));

  const result = [...ownedListed, ...followedListed] satisfies GetMyCollectionsResponse;
  return NextResponse.json(result, { status: 200 });
});

export const POST = wrapRoute(async (req) => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);
  const body = await validateRequestBody<CreateCollectionBody>(req, createCollectionSchema);

  const created = await prisma.collection.create({
    data: {
      userId: user.id,
      name: body.name,
      description: body.description ?? null,
      isPublic: false,
    },
    include: { _count: { select: { items: true } } },
  });

  const result = toListed(created);
  return NextResponse.json(result, { status: 201 });
});


