import { BadRequestError, NotFoundError } from "@/app/api/errors";
import {
  clearStackFolder,
  fetchRemoteStream,
  sanitizeFilename,
  streamFileFromStack,
  TypedFileStream,
  uploadFileToStack,
} from "@/app/api/files";
import { MAX_THUMBNAIL_FILE_SIZE } from "@/contracts/novels";
import prisma from "@/utils/db";
import { formatBytes } from "@lib/strings";
import path from "path";
import { ensureGetNovel } from "../../utils";
import { SETTINGS } from "@/app/api/settings";

export function validateThumbnail(file: File | null | undefined): File {
  if (!file) {
    throw new BadRequestError("Thumbnail file is required");
  }

  if (!file.type.startsWith("image/")) {
    throw new BadRequestError("Invalid file type. Only images are allowed.");
  }

  if (file.size > MAX_THUMBNAIL_FILE_SIZE) {
    throw new BadRequestError(
      `File size exceeds the limit of ${formatBytes(MAX_THUMBNAIL_FILE_SIZE)}.`
    );
  }

  return file;
}

export async function setNovelThumbnail(novelId: string, thumbnailFile: File) {
  // Build path to the thumbnail folder
  const thumbnailFolder = path.join("novels", `${novelId}`, "thumbnail");

  // Served from our API
  const sanitizedName = sanitizeFilename(thumbnailFile.name);
  const thumbnailUrl = `${SETTINGS.apiUrl}/novels/${novelId}/thumbnail/${sanitizedName}`;
  const dbPromise = prisma.novel.update({
    where: { id: novelId },
    data: { thumbnailUrl },
  });

  // Clear the folder if necessary
  await clearStackFolder(thumbnailFolder);

  const thumbnailPath = path.join(thumbnailFolder, sanitizedName);
  await uploadFileToStack(thumbnailPath, thumbnailFile);
  await dbPromise;

  return thumbnailUrl;
}

const localThumbnailPrefix = SETTINGS.apiUrl;
export async function getNovelThumbnailStream(
  novelId: string,
  fileName: string
): Promise<TypedFileStream> {
  const novel = await ensureGetNovel(novelId);

  const { thumbnailUrl } = novel;
  if (!thumbnailUrl) {
    throw new NotFoundError(`Novel ${novelId} has no thumbnail set`);
  }

  // If thumbnailUrl starts with our expected API base → local file
  if (
    thumbnailUrl.startsWith(`${localThumbnailPrefix}/novels/${novelId}/thumbnail`)
  ) {
    const filePath = path.join("novels", novelId, "thumbnail", fileName);
    return await streamFileFromStack(filePath);
  }

  // Otherwise → assume it's an external URL and fetch stream
  return {
    stream: await fetchRemoteStream(thumbnailUrl),
    contentType: "application/octet-stream", // Default, can be adjusted if needed
  };
}
