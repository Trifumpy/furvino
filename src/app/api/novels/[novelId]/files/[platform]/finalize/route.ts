import { NextResponse } from "next/server";
import { wrapRoute, revalidateTags } from "@/app/api/utils";
import { enrichToListedNovel, ensureCanUpdateNovel, ensureGetNovel } from "@/app/api/novels/utils";
import { PLATFORMS, Platform } from "@/contracts/novels";
import { BadRequestError } from "@/app/api/errors";
import prisma from "@/utils/db";
import { novelTags } from "@/utils";
import { Prisma } from "@/generated/prisma";
import { StackService } from "@/app/api/stack";
import { waitForNodeId } from "../../utils";

type Params = { novelId: string; platform: string };

export const POST = wrapRoute<Params>(async (request, { params }) => {
  const { novelId, platform } = await params;

  if (!PLATFORMS.includes(platform as Platform)) {
    throw new BadRequestError("Invalid platform");
  }
  const typedPlatform = platform as Platform;

  const novel = await ensureGetNovel(novelId);
  await ensureCanUpdateNovel(novel);

  const body = await request.json().catch(() => null) as { stackPath?: string; shareUrl?: string } | null;
  const stackPath = body?.stackPath;
  if (!stackPath) throw new BadRequestError("Missing stackPath");

  // Ensure file exists in STACK (poll until watcher syncs), then share it
  const nodeId = await waitForNodeId(stackPath);
  const shareUrl = body?.shareUrl || await StackService.get().shareNode(nodeId);

  // Patch DB
  const existingFileUrls: Prisma.JsonObject =
    typeof novel.downloadUrls === "object" && novel.downloadUrls !== null
      ? (novel.downloadUrls as Prisma.JsonObject)
      : {};
  const nextFileUrls: Prisma.JsonObject = { ...existingFileUrls, [typedPlatform]: shareUrl };

  const patched = await prisma.novel.update({
    where: { id: novelId },
    data: { downloadUrls: nextFileUrls },
  });

  const result = await enrichToListedNovel(patched);
  revalidateTags(novelTags.novel(novelId));
  revalidateTags(novelTags.list());
  return NextResponse.json(result, { status: 200 });
});


