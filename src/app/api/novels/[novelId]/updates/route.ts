import { NextResponse } from "next/server";
import { wrapRoute, ensureClerkId } from "../../utils";
import prisma from "@/utils/db";
import z from "zod";
import { MAX_UPDATE_TITLE_LENGTH } from "@/contracts/novels";
import { enrichToFullNovel, ensureCanUpdateNovel, ensureGetNovel } from "../../utils";
import { novelTags } from "@/utils";
import { revalidateTags } from "../../utils";

const createSchema = z.object({
  title: z.string().min(1).max(MAX_UPDATE_TITLE_LENGTH),
  contentRich: z.unknown().optional(),
});

export const GET = wrapRoute(async (req, { params }: { params: Promise<{ novelId: string }> }) => {
  const { novelId } = await params;
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "3");

  const updates = await prisma.novelUpdate.findMany({
    where: { novelId },
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(limit, 1000)),
  });

  return NextResponse.json(
    updates.map((u) => ({
      id: u.id,
      novelId: u.novelId,
      title: u.title,
      contentRich: (u as unknown as { contentRich?: unknown }).contentRich ?? null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }))
  );
});

export const POST = wrapRoute(async (req, { params }: { params: Promise<{ novelId: string }> }) => {
  const { novelId } = await params;
  const body = await req.json();
  const parsed = createSchema.parse(body);

  const novel = await ensureGetNovel(novelId);
  await ensureCanUpdateNovel(novel);

  const created = await prisma.novelUpdate.create({
    data: {
      novelId,
      title: parsed.title,
      contentRich: parsed.contentRich as unknown as object | undefined,
    },
  });

  revalidateTags(novelTags.novel(novelId));

  return NextResponse.json(
    {
      id: created.id,
      novelId: created.novelId,
      title: created.title,
      contentRich: (created as unknown as { contentRich?: unknown }).contentRich ?? null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
    { status: 201 }
  );
});


