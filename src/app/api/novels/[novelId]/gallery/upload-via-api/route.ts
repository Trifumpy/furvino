import { NextResponse } from "next/server";
import { wrapRoute, revalidateTags } from "@/app/api/utils";
import { enrichToFullNovel, ensureCanUpdateNovel, ensureGetNovel } from "@/app/api/novels/utils";
import { BadRequestError } from "@/app/api/errors";
import prisma from "@/utils/db";
import { novelTags } from "@/utils";
import { SETTINGS } from "@/app/api/settings";
import { sanitizeFilename, ensureFolderExists, uploadFileToStack } from "@/app/api/files";
import { StackService } from "@/app/api/stack";
import path from "path";

type Params = { novelId: string };

/**
 * PUT endpoint for uploading gallery images via WebDAV (file system)
 * File goes through VPS via parallel uploads to mounted STACK location
 */
export const PUT = wrapRoute<Params>(async (request, { params }) => {
  const { novelId } = await params;

  const novel = await ensureGetNovel(novelId);
  await ensureCanUpdateNovel(novel);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const slotStr = formData.get("slot") as string | null;

  if (!file) {
    throw new BadRequestError("No file provided");
  }

  const slot = slotStr ? parseInt(slotStr, 10) : undefined;
  const slotFolder = slot && slot > 0 ? `gallery${slot}` : "gallery";

  // Save file to mounted STACK location via uploadFileToStack
  const relativePath = path.posix.join("novels", novelId, slotFolder);
  const sanitizedFilename = sanitizeFilename(file.name);
  const fullPath = path.join(relativePath, sanitizedFilename);
  
  await ensureFolderExists(relativePath);
  const stackPath = await uploadFileToStack(fullPath, file);

  // Poll for node ID (backend-only, not exposed to frontend)
  const stack = StackService.get();
  const maxAttempts = 300; // up to 5 minutes
  const intervalMs = 1000;
  let nodeId: number | null = null;
  const absoluteFilesPath = path.posix.join("files", stackPath.replace(/\\/g, "/"));
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    nodeId = await stack.getNodeIdByPath(absoluteFilesPath);
    if (nodeId) break;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  
  if (!nodeId) {
    throw new Error("File not yet available in STACK after upload. Please try again in a moment.");
  }

  // Create share for the uploaded image
  const shareUrl = await stack.shareNode(nodeId);

  // Create the gallery item with the share URL
  const galleryItem = await prisma.galleryItem.create({
    data: {
      novelId,
      imageUrl: shareUrl,
    },
    select: { id: true, imageUrl: true },
  });

  revalidateTags(novelTags.novel(novelId));
  revalidateTags(novelTags.list());

  return NextResponse.json(
    { id: galleryItem.id, imageUrl: galleryItem.imageUrl },
    { status: 200 }
  );
});
