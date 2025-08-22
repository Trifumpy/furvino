import { MAX_GALLERY_FILE_SIZE, MAX_GALLERY_ITEMS } from "@/contracts/novels";
import { validateImage } from "../images";
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
// Helper to compute the STACK path for a gallery item based on the stored imageUrl
export function getGalleryStackPath(novelId: string, imageUrl: string): string {
  const url = new URL(imageUrl);
  const fileName = url.searchParams.get("f");
  const folder = url.searchParams.get("g");

  const pathname = url.pathname; // e.g. /api/novels/<id>/gallery/<fileName or galleryItemId>
  const fallbackFileName = pathname.split("/").pop() ?? "";
  // In case the fallback contains an id, it is not suitable for path construction without file info

  const resolvedFileName = fileName || fallbackFileName;
  const resolvedFolder = folder || "gallery";

  return path.join("novels", novelId, resolvedFolder, resolvedFileName);
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

export async function uploadGalleryFile(
  novelId: string,
  imageFile: File,
  slot?: number
) {
  // Decide the target gallery folder: gallery1..galleryN (pick the lowest available)
  const existing = await prisma.galleryItem.findMany({
    where: { novelId },
    select: { imageUrl: true },
  });

  const used = new Set<number>();
  for (const { imageUrl } of existing) {
    try {
      const u = new URL(imageUrl);
      const g = u.searchParams.get("g");
      if (g && /^gallery\d+$/.test(g)) {
        used.add(parseInt(g.replace("gallery", ""), 10));
        continue;
      }
      const m = /\/gallery(\d+)\//.exec(u.pathname);
      if (m) used.add(parseInt(m[1], 10));
    } catch {
      // ignore bad urls
    }
  }

  let folderIndex = 1;
  if (slot && Number.isFinite(slot) && slot >= 1 && slot <= MAX_GALLERY_ITEMS) {
    folderIndex = slot;
  } else {
    while (used.has(folderIndex) && folderIndex <= MAX_GALLERY_ITEMS) folderIndex++;
  }
  const folderName = `gallery${folderIndex}`;

  const sanitizedName = sanitizeFilename(imageFile.name);
  // If a slot is specified and already used, replace the existing record in that slot
  let existingSlotItem: { id: string; imageUrl: string } | null = null;
  if (slot) {
    for (const { imageUrl } of existing) {
      try {
        const u = new URL(imageUrl);
        if (u.searchParams.get("g") === folderName) {
          const idFromPath = u.pathname.split("/").pop() ?? "";
          existingSlotItem = { id: idFromPath, imageUrl };
          break;
        }
      } catch {
        // ignore
      }
    }
    if (!existingSlotItem) {
      // As a fallback, try querying DB to find any item whose URL contains the folder
      const candidates = await prisma.galleryItem.findMany({ where: { novelId }, select: { id: true, imageUrl: true } });
      for (const c of candidates) {
        try {
          const u = new URL(c.imageUrl);
          if (u.searchParams.get("g") === folderName) {
            existingSlotItem = { id: c.id, imageUrl: c.imageUrl };
            break;
          }
        } catch {}
      }
    }
  }

  // Create (or reuse) DB row to get id for canonical streaming URL
  const recordId = existingSlotItem
    ? existingSlotItem.id
    : (await prisma.galleryItem.create({ data: { novelId, imageUrl: "about:blank" } })).id;

  const versionParam = Date.now();
  const imageUrl = `${SETTINGS.apiUrl}/novels/${novelId}/gallery/${recordId}?v=${versionParam}&f=${encodeURIComponent(
    sanitizedName
  )}&g=${folderName}`;

  // Upload to STACK under novels/<novelId>/<galleryX>/<file>
  const imagePath = path.join("novels", novelId, folderName, sanitizedName);
  await uploadFileToStack(imagePath, imageFile);

  // If replacing an existing item in this slot, delete its previous file from STACK
  if (existingSlotItem) {
    try {
      const oldPath = getGalleryStackPath(novelId, existingSlotItem.imageUrl);
      await deleteStackFile(oldPath);
    } catch {
      // best-effort cleanup
    }
  }

  const updated = await prisma.galleryItem.update({ where: { id: recordId }, data: { imageUrl } });

  revalidateTags(novelTags.novel(novelId));
  return updated;
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
    const constructedPath = getGalleryStackPath(novelId, url);
    await deleteStackFile(constructedPath);
  }

  await prisma.galleryItem.delete({ where: { id: itemId } });
  revalidateTags(novelTags.novel(novelId));
}
