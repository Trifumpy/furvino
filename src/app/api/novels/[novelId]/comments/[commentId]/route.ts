import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { ensureClerkId, wrapRoute } from "@/app/api/utils";

// Note: Params type is inferred from Next.js route segment

export const DELETE = wrapRoute<{ novelId: string; commentId: string }>(
  async (_req, { params }) => {
    const { clerkId } = await ensureClerkId();
    const { commentId } = await params;

    // Get comment with user
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { user: true },
    });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only comment owner or admin can delete
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const isOwner = comment.userId === user.id;
    const isAdmin = user.roles.includes("admin");
    // Allow the author of the novel to delete any comment on their novel
    const novel = await prisma.novel.findUnique({ where: { id: comment.novelId } });
    const isNovelAuthor = !!novel && !!user.authorId && novel.authorId === user.authorId;
    if (!isOwner && !isAdmin && !isNovelAuthor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ ok: true }, { status: 200 });
  }
);


