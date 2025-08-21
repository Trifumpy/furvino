import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { ensureClerkId, validateRequestBody, wrapRoute } from "@/app/api/utils";
import { getOrCreateUserByExternalId } from "@/app/api/users";
import { NotFoundError } from "@/app/api/errors";
import { NextParams } from "@/app/types";
import { ListedNovel } from "@/contracts/novels";
import { enrichNovelWithAuthor } from "@/app/api/novels/utils";
import {
  UpdateCollectionBody,
  updateCollectionSchema,
} from "@/contracts/collections";

type Params = { collectionId: string };

export const DELETE = wrapRoute<Params>(
  async (_req, { params }: NextParams<Params>) => {
    const { clerkId } = await ensureClerkId();
    const user = await getOrCreateUserByExternalId(clerkId);
    const { collectionId } = await params;

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection || collection.userId !== user.id) {
      throw new NotFoundError("Collection not found");
    }

    await prisma.collection.delete({ where: { id: collectionId } });
    return NextResponse.json({ ok: true }, { status: 200 });
  }
);

export const GET = wrapRoute<Params>(
  async (_req, { params }: NextParams<Params>) => {
    const { clerkId } = await ensureClerkId();
    const user = await getOrCreateUserByExternalId(clerkId);
    const { collectionId } = await params;

    const data = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        items: {
          include: {
            novel: {
              include: {
                author: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });
    if (!data || (data.userId !== user.id && !data.isPublic)) {
      throw new NotFoundError("Collection not found");
    }

    const novels: ListedNovel[] = await Promise.all(
      data.items.map(
        async (ci) =>
          await enrichNovelWithAuthor({ ...ci.novel, author: ci.novel.author })
      )
    );

    const isFollowing = !!(await prisma.collectionFollow.findUnique({
      where: { collectionId_userId: { collectionId, userId: user.id } },
    }));

    return NextResponse.json({
      id: data.id,
      name: data.name,
      description: data.description,
      isPublic: data.isPublic,
      isOwner: data.userId === user.id,
      isFollowing,
      novels,
    });
  }
);

export const PUT = wrapRoute<Params>(
  async (req, { params }: NextParams<Params>) => {
    const { clerkId } = await ensureClerkId();
    const user = await getOrCreateUserByExternalId(clerkId);
    const { collectionId } = await params;
    const body = await validateRequestBody<UpdateCollectionBody>(
      req,
      updateCollectionSchema
    );

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection || collection.userId !== user.id) {
      throw new NotFoundError("Collection not found");
    }

    const updated = await prisma.collection.update({
      where: { id: collectionId },
      data: {
        name: body.name ?? undefined,
        description: body.description ?? undefined,
        // Allow toggling visibility when provided
        isPublic: body.hasOwnProperty("isPublic")
          ? ((body as unknown as { isPublic?: boolean }).isPublic ?? false)
          : undefined,
      },
      include: { _count: { select: { items: true } } },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isPublic: updated.isPublic,
      itemsCount: updated._count.items,
    });
  }
);
