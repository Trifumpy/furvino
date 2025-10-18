import { NextResponse } from "next/server";
import { wrapRoute, revalidateTags } from "@/app/api/utils";
import { enrichToFullNovel, ensureCanUpdateNovel, ensureGetNovel } from "../../../utils";
import { BadRequestError } from "@/app/api/errors";
import prisma from "@/utils/db";
import { novelTags } from "@/utils";
import { authenticate, uploadFile as stackUploadFile, createDirectory, listChildren, getMe } from "@/utils/services/STACK";
import { SETTINGS } from "@/app/api/settings";
import { sanitizeFilename } from "@/app/api/files";

type Params = { novelId: string };

/**
 * PUT endpoint for uploading gallery images via STACK REST API
 * File goes through VPS but uses STACK API for better performance than WebDAV
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

  // Authenticate with STACK
  const auth = await authenticate(
    SETTINGS.stack.apiUrl,
    SETTINGS.stack.username,
    SETTINGS.stack.password
  );

  // Navigate to furvino/novels/<novelId>/<slotFolder>/ directory
  const { filesNodeID } = await getMe(auth);
  let currentParentID = filesNodeID;

  const pathParts = [SETTINGS.stack.prefix, "novels", novelId, slotFolder];
  for (const dirName of pathParts) {
    const children = await listChildren(auth, currentParentID);
    const existing = children.find((c) => c.name === dirName && c.dir);

    if (existing) {
      currentParentID = existing.id;
    } else {
      currentParentID = await createDirectory(auth, currentParentID, dirName);
    }
  }

  // Upload file using STACK REST API
  const fileName = sanitizeFilename(file.name);
  const arrayBuffer = await file.arrayBuffer();
  await stackUploadFile(auth, currentParentID, fileName, arrayBuffer);

  // First create the gallery item to get its id
  const created = await prisma.galleryItem.create({
    data: {
      novelId,
      imageUrl: "", // will be set right after with the final URL
    },
    select: { id: true },
  });

  // Generate VPS API URL for serving the image through WebDAV including slot folder, with the gallery item id in the path
  const versionParam = Date.now();
  const imageUrl = `${SETTINGS.apiUrl}/novels/${novelId}/gallery/${created.id}?v=${versionParam}&f=${encodeURIComponent(fileName)}&g=${encodeURIComponent(slotFolder)}`;

  // Update the created gallery item with the final URL
  const galleryItem = await prisma.galleryItem.update({
    where: { id: created.id },
    data: { imageUrl },
    select: { id: true, imageUrl: true },
  });

  revalidateTags(novelTags.novel(novelId));
  revalidateTags(novelTags.list());

  return NextResponse.json(
    { id: galleryItem.id, imageUrl: galleryItem.imageUrl },
    { status: 200 }
  );
});
