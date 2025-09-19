import { wrapRoute } from "@/app/api/utils";
import { deleteGalleryFile, getGalleryStackPath } from "../utils";
import { ensureCanUpdateNovel, ensureGetNovel } from "../../../utils";
import {
  DeleteNovelGalleryItemParams,
} from "@/contracts/novels";
import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { SETTINGS } from "@/app/api/settings";
import { streamFileFromStack } from "@/app/api/files";

type Params = DeleteNovelGalleryItemParams;

export const DELETE = wrapRoute<Params>(async (request, { params }) => {
  const { novelId, galleryItemId } = await params;
  
  const novel = await ensureGetNovel(novelId);
  await ensureCanUpdateNovel(novel);

  await deleteGalleryFile(novelId, galleryItemId);

  return new NextResponse(null, { status: 204 });
});

export const GET = wrapRoute<Params>(async (_req, { params }) => {
  const { novelId, galleryItemId } = await params;

  // Try by DB id first (new-style URL), fallback to treating param as fileName (old-style URL)
  let fileName: string | null = null;
  const byId = await prisma.galleryItem.findUnique({
    where: { id: galleryItemId, novelId },
  });
  if (byId?.imageUrl) {
    // compute fileName only when needed (removed unused variable usage)
    const urlNoQuery = byId.imageUrl.split("?")[0];
    fileName = urlNoQuery.split("/").pop() ?? null;
  }

  const url = byId?.imageUrl ?? `${SETTINGS.apiUrl}/novels/${novelId}/gallery/${galleryItemId}`;
  const stackPath = getGalleryStackPath(novelId, url);
  const { stream, contentType } = await streamFileFromStack(stackPath);

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});
