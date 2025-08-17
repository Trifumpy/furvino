import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { ensureClerkId, wrapRoute } from "@/app/api/utils";

export const DELETE = wrapRoute(async (_req, { params }: { params: Promise<{ novelId: string; ratingId: string }> }) => {
  const { novelId, ratingId } = await params;
  const { clerkId } = await ensureClerkId();

  // Load current user
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Load rating and ensure it belongs to the target novel
  const rating = await prisma.userRating.findUnique({ where: { id: ratingId } });
  if (!rating || rating.novelId !== novelId) {
    return NextResponse.json({ error: "Rating not found" }, { status: 404 });
  }

  // Load novel to check author
  const novel = await prisma.novel.findUnique({ where: { id: novelId } });
  if (!novel) {
    return NextResponse.json({ error: "Novel not found" }, { status: 404 });
  }

  const isAdmin = user.roles.includes("admin");
  const isNovelAuthor = !!user.authorId && user.authorId === novel.authorId;
  if (!isAdmin && !isNovelAuthor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.userRating.update({ where: { id: ratingId }, data: { reason: null } });

  return NextResponse.json({ ok: true, id: updated.id });
});


