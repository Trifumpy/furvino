import { NextResponse } from "next/server";
import { wrapRoute, revalidateTags } from "@/app/api/utils";
import { enrichToListedNovel, ensureCanUpdateNovel, ensureGetNovel } from "@/app/api/novels/utils";
import { PLATFORMS, Platform } from "@/contracts/novels";
import { BadRequestError } from "@/app/api/errors";
import prisma from "@/utils/db";
import { novelTags } from "@/utils";
import { Prisma } from "@/generated/prisma";
import { saveNovelFile, waitForNodeId } from "../../utils";
import { StackService } from "@/app/api/stack";
import { getUploadFolder } from "@/novels/utils";

type Params = { novelId: string; platform: string };

/**
 * PUT endpoint for uploading download files via WebDAV (file system)
 * File goes through VPS via parallel uploads to mounted STACK location
 */
export const PUT = wrapRoute<Params>(async (request, { params }) => {
  const { novelId, platform } = await params;

  if (!PLATFORMS.includes(platform as Platform)) {
    throw new BadRequestError("Invalid platform");
  }
  const typedPlatform = platform as Platform;

  const novel = await ensureGetNovel(novelId);
  await ensureCanUpdateNovel(novel);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    throw new BadRequestError("No file provided");
  }

  const relativePath = getUploadFolder(novelId, typedPlatform);
  const stackPath = await saveNovelFile(relativePath, file);

  const nodeId = await waitForNodeId(stackPath);
  const shareUrl = await StackService.get().shareNode(nodeId);

  // Update database - use raw query for atomic JSON merge
  const existingFileUrls: Prisma.JsonObject =
    typeof novel.downloadUrls === "object" && novel.downloadUrls !== null
      ? (novel.downloadUrls as Prisma.JsonObject)
      : {};
  const nextFileUrls: Prisma.JsonObject = {
    ...existingFileUrls,
    [typedPlatform]: shareUrl,
  };

  const patched = await prisma.novel.update({
    where: { id: novelId },
    data: {
      downloadUrls: nextFileUrls,
    },
  });

  const result = await enrichToListedNovel(patched);

  revalidateTags(novelTags.novel(novelId));
  revalidateTags(novelTags.list());
  return NextResponse.json(result, { status: 200 });
});