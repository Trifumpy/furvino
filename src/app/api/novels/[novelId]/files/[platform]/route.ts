import { NextResponse } from "next/server";
import { wrapRoute, revalidateTags } from "@/app/api/utils";
import { enrichNovel, ensureCanUpdateNovel, ensureGetNovel } from "@/app/api/novels/utils";
import { PLATFORMS, Platform } from "@/contracts/novels";
import { BadRequestError } from "@/app/api/errors";
import path from "path";
import { sanitizeFilename, uploadFileToStack, readFileFromStack } from "@/app/api/files";
import prisma from "@/utils/db";
import { novelTags } from "@/utils";
import { StackService } from "@/app/api/stack/StackService";
import { Prisma } from "@/generated/prisma";

const MAX_NOVEL_FILE_SIZE = Math.floor(1.5 * 1024 * 1024 * 1024); // 1.5 GB

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
  let nodeId = await stack.getNodeIdByRelativePath(stackRelativePath);
  if (!nodeId) {
    // Fallback to chunked upload session for very large files
    const bufferChunkSize = 8 * 1024 * 1024; // 8 MiB
    const totalSize = file.size;
    const relativeDirParts = ["novels", novelId, "files", typedPlatform];
    const filename = sanitizedName;

    // Read from mounted file in chunks
    const fullBuffer = await readFileFromStack(stackRelativePath);
    const readChunk = async (start: number, chunkSize: number) => {
      const end = Math.min(start + chunkSize, fullBuffer.length);
      if (start >= end) return Buffer.alloc(0);
      return Buffer.from(fullBuffer.subarray(start, end));
    };

    nodeId = await stack.uploadLargeFileWithSession(
      relativeDirParts,
      filename,
      readChunk,
      totalSize,
      bufferChunkSize
    );
  }
  const shareUrl = await stack.shareNode(nodeId);

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


