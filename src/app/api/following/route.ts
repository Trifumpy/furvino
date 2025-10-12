import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { ensureClerkId, getQueryParams, wrapRoute } from "../utils";
import z from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const GET = wrapRoute(async (req) => {
  const { clerkId } = await ensureClerkId();
  const user = await (await import("../users")).getOrCreateUserByExternalId(clerkId);
  const { page = 1, pageSize = 20 } = getQueryParams(req, querySchema);

  // Followed authors
  const follows = await prisma.authorFollow.findMany({
    where: { userId: user.id },
    include: { author: true },
    orderBy: { createdAt: "desc" },
  });

  const authorIds = follows.map((f) => f.authorId);

  // Recent updates from novels by followed authors
  const updates = await prisma.novelUpdate.findMany({
    where: { novel: { authorId: { in: authorIds } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      novel: { select: { id: true, title: true, authorId: true, author: { select: { id: true, name: true } } } },
    },
  });

  const read = await prisma.novelUpdateRead.findMany({
    where: { userId: user.id, updateId: { in: updates.map((u) => u.id) } },
  });
  const readSet = new Set(read.map((r) => r.updateId));

  return NextResponse.json({
    authors: follows.map((f) => ({ id: f.author.id, name: f.author.name, isFollowing: true })),
    updates: updates.map((u) => ({
      id: u.id,
      title: u.title,
      contentRich: (u as unknown as { contentRich?: unknown }).contentRich ?? null,
      createdAt: u.createdAt.toISOString(),
      novel: { id: u.novel.id, title: u.novel.title },
      author: { id: u.novel.author.id, name: u.novel.author.name },
      isRead: readSet.has(u.id),
    })),
    page,
    pageSize,
  });
});


