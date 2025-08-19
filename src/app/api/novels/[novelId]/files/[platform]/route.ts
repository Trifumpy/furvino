import { NextResponse } from "next/server";
import { wrapRoute, revalidateTags } from "@/app/api/utils";
import { enrichNovel, ensureCanUpdateNovel, ensureGetNovel } from "@/app/api/novels/utils";
import { MAX_NOVEL_FILE_SIZE, PLATFORMS, Platform } from "@/contracts/novels";
import { BadRequestError } from "@/app/api/errors";
import prisma from "@/utils/db";
import { novelTags } from "@/utils";
import { StackService } from "@/app/api/stack/StackService";
import { Prisma } from "@/generated/prisma";
import { getUploadFolder, saveNovelFile } from "../utils";

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

  const stack = StackService.get();

  // Poll for the existing directory and file to appear in STACK after the watcher syncs it
  const maxAttempts = 60; // ~60s at 1s interval
  const intervalMs = 1000;
  let nodeId: number | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    nodeId = await stack.getNodeIdByRelativePath(stackPath);
    if (nodeId) break;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  if (!nodeId) {
    throw new Error("File not yet available in STACK after upload. Please try again in a moment.");
  }

  const shareUrl = await stack.shareNode(nodeId);

  // Patch DB field
  const existingFileUrls: Prisma.JsonObject =
    typeof novel.magnetUrls === "object" && novel.magnetUrls !== null
      ? (novel.magnetUrls as Prisma.JsonObject)
      : {};
  const fileUrls: Prisma.JsonObject = {
    ...existingFileUrls,
    [typedPlatform]: shareUrl,
  };

  const patched = await prisma.novel.update({
    where: { id: novelId },
    data: {
      magnetUrls: fileUrls,
    },
  });

  const result = await enrichNovel(patched);

  revalidateTags(novelTags.novel(novelId));
  revalidateTags(novelTags.list());
  return NextResponse.json(result, { status: 200 });
});
