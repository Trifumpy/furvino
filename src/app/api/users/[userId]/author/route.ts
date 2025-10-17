import { NextResponse } from "next/server";
import { ensureAdmin, wrapRoute } from "@/app/api/utils";
import prisma from "@/utils/db";
import { ConflictError, NotFoundError } from "@/app/api/errors";

export const DELETE = wrapRoute<{ userId: string }>(async (req, { params }) => {
  await ensureAdmin();
  const { userId } = await params;
  const remove = req.nextUrl.searchParams.get("remove") === "true";

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User not found");
  if (!user.authorId) return NextResponse.json({ ok: true });

  const authorId = user.authorId;

  if (remove) {
    const novelsCount = await prisma.novel.count({ where: { authorId } });
    if (novelsCount > 0) {
      throw new ConflictError("Cannot remove author with existing novels");
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { authorId: null } }),
      prisma.author.delete({ where: { id: authorId } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  await prisma.user.update({ where: { id: userId }, data: { authorId: null } });
  return NextResponse.json({ ok: true });
});


