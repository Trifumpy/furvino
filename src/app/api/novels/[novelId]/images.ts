import { BadRequestError, NotFoundError } from "@/app/api/errors";
import {
  clearStackFolder,
  fetchRemoteStream,
  sanitizeFilename,
  streamFileFromStack,
  TypedFileStream,
  uploadFileToStack,
} from "@/app/api/files";
import prisma from "@/utils/db";
import { formatBytes } from "@lib/strings";
import path from "path";
import { ensureGetNovel } from "../utils";
import { SETTINGS } from "@/app/api/settings";

export function validateImage(file: File | null | undefined, maxSize: number): File {
  if (!file) {
    throw new BadRequestError("Image file is required");
  }

  if (!file.type.startsWith("image/")) {
    throw new BadRequestError("Invalid file type. Only images are allowed.");
  }

  if (file.size > maxSize) {
    throw new BadRequestError(
      `File size exceeds the limit of ${formatBytes(maxSize)}.`
    );
  }

  return file;
}

export type NovelImageSlot = "thumbnail" | "banner";
export async function setNovelImage(novelId: string, imageFile: File, slot: NovelImageSlot) {
  // Build path to the image folder
  const imageFolder = path.join("novels", `${novelId}`, slot);

  // Served from our API
  const sanitizedName = sanitizeFilename(imageFile.name);
  // Add a version query parameter so browsers can cache aggressively while
  // still getting fresh content on updates.
  const versionParam = Date.now();
  const imageUrl = `${SETTINGS.apiUrl}/novels/${novelId}/${slot}/${sanitizedName}?v=${versionParam}`;
  const fieldName = slot === "thumbnail" ? "thumbnailUrl" : "pageBackgroundUrl";
  const dbPromise = prisma.novel.update({
    where: { id: novelId },
    data: { [fieldName]: imageUrl },
  });

  // Clear the folder if necessary
  await clearStackFolder(imageFolder);

  const imagePath = path.join(imageFolder, sanitizedName);
  await uploadFileToStack(imagePath, imageFile);
  await dbPromise;

  return imageUrl;
}

const localImagePrefix = SETTINGS.apiUrl;
export async function getNovelImageStream(
  novelId: string,
  slot: NovelImageSlot | "gallery",
  fileName: string
): Promise<TypedFileStream> {
  const novel = await ensureGetNovel(novelId);

  const imageUrl = slot === "thumbnail" ? novel.thumbnailUrl : (novel as unknown as { pageBackgroundUrl?: string | null }).pageBackgroundUrl;
  if (!imageUrl) {
    throw new NotFoundError(`Novel ${novelId} has no ${slot} set`);
  }

  // If imageUrl starts with our expected API base → local file
  if (
    imageUrl.startsWith(
      `${localImagePrefix}/novels/${novelId}/${slot}/`
    )
  ) {
    const filePath = path.join("novels", novelId, slot, fileName);
    return await streamFileFromStack(filePath);
  }

  // Otherwise → assume it's an external URL and fetch stream
  return {
    stream: await fetchRemoteStream(imageUrl),
    contentType: "application/octet-stream", // Default, can be adjusted if needed
  };
}
