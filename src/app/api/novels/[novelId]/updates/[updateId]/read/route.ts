import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { ensureClerkId, wrapRoute } from "@/app/api/utils";
import { getOrCreateUserByExternalId } from "@/app/api/users";

export const POST = wrapRoute(async (_req, { params }: { params: Promise<{ novelId: string; updateId: string }> }) => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);
  const { updateId } = await params;

  await prisma.novelUpdateRead.upsert({
    where: { updateId_userId: { updateId, userId: user.id } },
    update: { readAt: new Date() },
    create: { updateId, userId: user.id },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
});

export const DELETE = wrapRoute(async (_req, { params }: { params: Promise<{ novelId: string; updateId: string }> }) => {
  const { clerkId } = await ensureClerkId();
  const user = await getOrCreateUserByExternalId(clerkId);
  const { updateId } = await params;

  await prisma.novelUpdateRead.deleteMany({ where: { updateId, userId: user.id } });
  return NextResponse.json({ ok: true }, { status: 200 });
});


