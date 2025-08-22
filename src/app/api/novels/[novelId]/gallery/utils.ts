import { MAX_GALLERY_FILE_SIZE, MAX_GALLERY_ITEMS } from "@/contracts/novels";
import { getNovelImageStream, validateImage } from "../images";
import path from "path";
import { deleteStackFile, sanitizeFilename, uploadFileToStack } from "@/app/api/files";
import { SETTINGS } from "@/app/api/settings";
import prisma from "@/utils/db";
import { enrichToFullNovel, ensureCanUpdateNovel, ensureGetNovel } from "../../utils";
import { ConflictError, NotFoundError } from "@/app/api/errors";
import { revalidateTags } from "@/app/api/utils";
import { novelTags } from "@/utils";

export function validateGalleryFile(file: File | null | undefined): File {
  return validateImage(file, MAX_GALLERY_FILE_SIZE);
}
export async function getNovelGalleryStream(novelId: string, fileName: string) {
  return await getNovelImageStream(novelId, "gallery", fileName);
}

export async function ensureCanUploadToGallery(novelId: string) {
  const novel = await ensureGetNovel(novelId);
  await ensureCanUpdateNovel(novel);

  const fullNovel = await enrichToFullNovel(novel);

  if (fullNovel.galleryItems.length >= MAX_GALLERY_ITEMS) {
    throw new ConflictError(`A maximum of ${MAX_GALLERY_ITEMS} gallery items are allowed.`);
  }

  return fullNovel;
}

export async function uploadGalleryFile(novelId: string, imageFile: File) {
  // Build path to the image folder
  const imageFolder = path.join("novels", `${novelId}`, "gallery");

  // Served from our API
  const sanitizedName = sanitizeFilename(imageFile.name);
  // Add a version query parameter so browsers can cache aggressively while
  // still getting fresh content on updates.
  const versionParam = Date.now();
  const imageUrl = `${SETTINGS.apiUrl}/novels/${novelId}/gallery/${sanitizedName}?v=${versionParam}`;
  const dbPromise = prisma.galleryItem.create({
    data: { novelId, imageUrl },
  });

  const imagePath = path.join(imageFolder, sanitizedName);
  await uploadFileToStack(imagePath, imageFile);

  revalidateTags(novelTags.novel(novelId));
  return await dbPromise;
}

export async function deleteGalleryFile(novelId: string, itemId: string) {
  const galleryItem = await prisma.galleryItem.findUnique({
    where: { id: itemId, novelId },
  });

  if (!galleryItem) {
    throw new NotFoundError("Gallery item not found");
  }

  const url = galleryItem.imageUrl;
  if (url.startsWith(SETTINGS.apiUrl)) {
    // Extract the fileName from the API URL
    const fileName = url.split("?")[0].split('/').pop();
    const constructedPath = path.join("novels", novelId, "gallery", fileName || "");
    await deleteStackFile(constructedPath);
  }

  await prisma.galleryItem.delete({ where: { id: itemId } });
  revalidateTags(novelTags.novel(novelId));
}
