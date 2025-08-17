import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { Prisma } from "@/generated/prisma";
import { ensureClerkId, validateRequestBody, wrapRoute } from "@/app/api/utils";
import { GetNovelParams } from "@/contracts/novels";
import z from "zod";
import { syncUser } from "@/utils/clerk";

const MAX_COMMENT_LENGTH = 500;
const createCommentSchema = z.object({
  text: z.string().min(1, "Comment cannot be empty").max(MAX_COMMENT_LENGTH),
  parentId: z.string().uuid().optional(),
});

export const GET = wrapRoute<GetNovelParams>(async (req, { params }) => {
  const { novelId } = await params;
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? '15');
  const repliesLimit = Number(url.searchParams.get('replies') ?? '10');

  const includePart = {
    user: { select: { id: true, username: true, avatarUrl: true, authorId: true } },
    replies: {
      include: { user: { select: { id: true, username: true, avatarUrl: true, authorId: true } } },
      orderBy: { createdAt: "asc" as const },
      take: Math.max(1, Math.min(repliesLimit, 50)),
    },
  } satisfies Prisma.CommentFindManyArgs["include"];

  type RootWithRelations = Prisma.CommentGetPayload<{ include: typeof includePart }>;

  const rootsRaw = await prisma.comment.findMany({
    where: { novelId, parentId: null },
    include: includePart,
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(limit, 100)),
  });
  const roots = rootsRaw as unknown as RootWithRelations[];

  const payload = (roots as RootWithRelations[]).map((c) => ({
    id: c.id,
    text: c.text,
    createdAt: c.createdAt.toISOString(),
    user: {
      id: c.user.id,
      username: c.user.username,
      avatarUrl: c.user.avatarUrl,
      authorId: c.user.authorId,
    },
    replies: c.replies.map((r) => ({
      id: r.id,
      text: r.text,
      createdAt: r.createdAt.toISOString(),
      user: {
        id: r.user.id,
        username: r.user.username,
        avatarUrl: r.user.avatarUrl,
        authorId: r.user.authorId,
      },
    })),
  }));

  return NextResponse.json(payload);
});

export const POST = wrapRoute<GetNovelParams>(async (req, { params }) => {
  const { novelId } = await params;
  const { clerkId } = await ensureClerkId();

  const body = await validateRequestBody(req, createCommentSchema);

  // Map Clerk user to local user, fallback to sync if missing
  const user = (await prisma.user.findUnique({ where: { clerkId } })) ?? (await syncUser(clerkId));

  const createArgs: Prisma.CommentCreateArgs = {
    data: {
      novelId,
      userId: user.id,
      text: body.text,
      parentId: body.parentId ?? null,
    },
    include: {
      user: {
        select: { id: true, username: true, avatarUrl: true, authorId: true },
      },
    },
  };
  const createdRaw = await prisma.comment.create(createArgs);

  type CreatedWithUser = Prisma.CommentGetPayload<{ include: { user: { select: { id: true; username: true; avatarUrl: true; authorId: true } } } }>;
  const created = createdRaw as unknown as CreatedWithUser;

  const payload = {
    id: created.id,
    text: created.text,
    createdAt: created.createdAt.toISOString(),
    user: {
      id: created.user.id,
      username: created.user.username,
      avatarUrl: created.user.avatarUrl,
      authorId: created.user.authorId,
    },
    replies: [],
  };

  return NextResponse.json(payload, { status: 201 });
});


