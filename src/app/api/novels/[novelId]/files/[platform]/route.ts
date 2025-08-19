import { NextResponse } from "next/server";
import { wrapRoute, revalidateTags } from "@/app/api/utils";
import { enrichNovel, ensureCanUpdateNovel, ensureGetNovel } from "@/app/api/novels/utils";
import { PLATFORMS, Platform } from "@/contracts/novels";
import { BadRequestError } from "@/app/api/errors";
import path from "path";
import { sanitizeFilename, uploadFileToStack } from "@/app/api/files";
import prisma from "@/utils/db";
import { novelTags } from "@/utils";
import { StackService } from "@/app/api/stack/StackService";
import { SETTINGS } from "@/app/api/settings";
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
  // Local relative path from STACK_ROOT mount
  const localRelativePath = path.join("novels", novelId, "files", typedPlatform, sanitizedName);
  // Include prefix under files/ if configured, so STACK path matches ingested structure for API lookup
  const rawPrefix = process.env.STACK_PREFIX || SETTINGS.stack.prefix || "/files";
  let prefixUnderFiles = rawPrefix.replace(/^\/+/, "");
  if (prefixUnderFiles.startsWith("files/")) prefixUnderFiles = prefixUnderFiles.slice(6);
  const baseParts = prefixUnderFiles.split("/").filter(Boolean);
  const stackRelativePath = path.posix.join(...baseParts, "novels", novelId, "files", typedPlatform, sanitizedName);

  // Save to mounted stack
  await uploadFileToStack(localRelativePath, file);

  // After saving to mounted storage, wait for STACK to ingest the file and create a public share link
  const externalApiUrl = process.env.STACK_API_URL;
  const stackUsername = process.env.STACK_USERNAME;
  const stackPassword = process.env.STACK_PASSWORD;
  if (!externalApiUrl || !stackUsername || !stackPassword) {
    throw new Error("STACK API credentials are not configured (STACK_API_URL, STACK_USERNAME, STACK_PASSWORD)");
  }

  const stack = new StackService(externalApiUrl, stackUsername, stackPassword);

  // Poll for the existing directory and file to appear in STACK after the watcher syncs it
  // Retry more frequently and for a longer period (500ms for up to 5 minutes)
  const maxAttempts = 600; // 600 * 500ms = ~300s (5 minutes)
  const intervalMs = 500;
  let nodeId: number | null = null;
  // Try node-id endpoint by absolute path first (under /files)
  const absoluteFilesPath = path.posix.join("files", stackRelativePath);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    nodeId = await stack.getNodeIdByPath(absoluteFilesPath);
    if (!nodeId) {
      nodeId = await stack.getNodeIdByRelativePath(stackRelativePath);
    }
    if (nodeId) break;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  if (!nodeId) {
    throw new Error("File not yet available in STACK after upload. Please try again in a moment.");
  }

  // Note: We no longer delete other files in this platform folder.

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


