import { NextResponse } from "next/server";
import { wrapRoute } from "@/app/api/utils";
import { ensureCanUpdateNovel, ensureGetNovel } from "../../../utils";
import { novelTags } from "@/utils";
import { revalidateTags } from "@/app/api/utils";
import { SETTINGS } from "@/app/api/settings";
import prisma from "@/utils/db";
import { sanitizeFilename } from "@/app/api/files";

/**
 * POST endpoint to create gallery item after direct STACK upload
 * Does not upload file - assumes file is already on STACK
 */
export const POST = wrapRoute(
  async (request, { params }: { params: Promise<{ novelId: string }> }) => {
    const { novelId } = await params;

    const novel = await ensureGetNovel(novelId);
    await ensureCanUpdateNovel(novel);

    const body = await request.json();
    const { fileName, slot } = body as { fileName: string; slot?: number };

    if (!fileName) {
      return NextResponse.json({ error: "fileName required" }, { status: 400 });
    }

    const sanitizedName = sanitizeFilename(fileName);
    const versionParam = Date.now();
    const folderName = slot ? `gallery${slot}` : "gallery";
    
    const imageUrl = `${SETTINGS.apiUrl}/novels/${novelId}/gallery/${novelId}?v=${versionParam}&f=${encodeURIComponent(
      sanitizedName
    )}&g=${folderName}`;

    // Create gallery item in database
    const galleryItem = await prisma.galleryItem.create({
      data: {
        novelId,
        imageUrl,
      },
    });

    revalidateTags(novelTags.novel(novelId));
    revalidateTags(novelTags.list());

    return NextResponse.json(
      { id: galleryItem.id, imageUrl: galleryItem.imageUrl },
      { status: 200 }
    );
  }
);

