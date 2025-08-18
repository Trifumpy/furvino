import { NextResponse } from "next/server";
import { wrapRoute, revalidateTags } from "@/app/api/utils";
import { enrichNovel, ensureCanUpdateNovel, ensureGetNovel } from "@/app/api/novels/utils";
import { PLATFORMS, Platform } from "@/contracts/novels";
import { BadRequestError } from "@/app/api/errors";
import path from "path";
import { sanitizeFilename, uploadFileToStack, readFileFromStack } from "@/app/api/files";
import prisma from "@/utils/db";
import { SETTINGS } from "@/app/api/settings";
import { novelTags } from "@/utils";
import { StackService } from "@/app/api/stack/StackService";
import { Prisma } from "@/generated/prisma";

const MAX_NOVEL_FILE_SIZE = 128 * 1024 * 1024; // 128MB

export const PUT = wrapRoute(async (request, { params }) => {
  const { novelId, platform } = await params as { novelId: string; platform: string };

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

  const sanitizedName = sanitizeFilename(file.name);
  const stackRelativePath = path.join("novels", novelId, "files", typedPlatform, sanitizedName);

  // Save to mounted stack
  await uploadFileToStack(stackRelativePath, file);

  // Share via STACK API (use external STACK API URL, not our Next API)
  const externalApiUrl = process.env.STACK_API_URL;
  const stackUsername = process.env.STACK_USERNAME;
  const stackPassword = process.env.STACK_PASSWORD;
  if (!externalApiUrl || !stackUsername || !stackPassword) {
    throw new Error("STACK API credentials are not configured (STACK_API_URL, STACK_USERNAME, STACK_PASSWORD)");
  }

  const stack = new StackService(externalApiUrl, stackUsername, stackPassword);
  let shareUrl: string;
  const maybeExistingNodeId = await stack.getNodeIdByRelativePath(stackRelativePath);
  if (maybeExistingNodeId) {
    shareUrl = await stack.shareNode(maybeExistingNodeId);
  } else {
    const buffer = await readFileFromStack(stackRelativePath);
    shareUrl = await stack.uploadAndShareByRelativePath(stackRelativePath, buffer);
  }

  // Patch DB field
  const existingMagnetUrls: Prisma.JsonObject =
    typeof novel.magnetUrls === "object" && novel.magnetUrls !== null
      ? (novel.magnetUrls as Prisma.JsonObject)
      : {};
  const nextMagnetUrls: Prisma.JsonObject = {
    ...existingMagnetUrls,
    [typedPlatform]: shareUrl,
  };

  const patched = await prisma.novel.update({
    where: { id: novelId },
    data: {
      magnetUrls: nextMagnetUrls,
    },
  });

  const result = await enrichNovel(patched);

  revalidateTags(novelTags.novel(novelId));
  revalidateTags(novelTags.list());
  return NextResponse.json(result, { status: 200 });
});


