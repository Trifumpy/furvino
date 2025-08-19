import { NextResponse } from "next/server";
import { wrapRoute, revalidateTags } from "@/app/api/utils";
import { enrichNovel, ensureCanUpdateNovel, ensureGetNovel } from "@/app/api/novels/utils";
import { MAX_NOVEL_FILE_SIZE, PLATFORMS, Platform } from "@/contracts/novels";
import { BadRequestError } from "@/app/api/errors";
import prisma from "@/utils/db";
import { novelTags } from "@/utils";
import { StackService } from "@/app/api/stack/StackService";
import { Prisma } from "@/generated/prisma";
import { getUploadFolder, saveNovelFile, waitForNodeId } from "../utils";

type Params = { novelId: string; platform: string };

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
  if (!file) throw new BadRequestError("File is required");
  if (file.size > MAX_NOVEL_FILE_SIZE) throw new BadRequestError("File too large");

  const relativePath = getUploadFolder(novelId, typedPlatform);
  const stackPath = await saveNovelFile(relativePath, file);

  const nodeId = await waitForNodeId(stackPath);
  const shareUrl = await StackService.get().shareNode(nodeId);

  // Patch DB field
  const existingFileUrls: Prisma.JsonObject =
    typeof novel.magnetUrls === "object" && novel.magnetUrls !== null
      ? (novel.magnetUrls as Prisma.JsonObject)
      : {};
  const nextFileUrls: Prisma.JsonObject = {
    ...existingFileUrls,
    [typedPlatform]: shareUrl,
  };

  const patched = await prisma.novel.update({
    where: { id: novelId },
    data: {
      magnetUrls: nextFileUrls,
    },
  });

  const result = await enrichNovel(patched);

  revalidateTags(novelTags.novel(novelId));
  revalidateTags(novelTags.list());
  return NextResponse.json(result, { status: 200 });
});
