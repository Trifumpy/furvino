import { NextResponse } from "next/server";
import { wrapRoute } from "@/app/api/utils";
import { enrichToFullNovel, ensureCanUpdateNovel, ensureGetNovel } from "../../../utils";
import { novelTags } from "@/utils";
import { revalidateTags } from "@/app/api/utils";
import { SETTINGS } from "@/app/api/settings";
import prisma from "@/utils/db";

/**
 * POST endpoint to update banner URL after direct STACK upload
 * Does not upload file - assumes file is already on STACK
 */
export const POST = wrapRoute(
  async (request, { params }: { params: Promise<{ novelId: string }> }) => {
    const { novelId } = await params;

    const novel = await ensureGetNovel(novelId);
    await ensureCanUpdateNovel(novel);

    const body = await request.json();
    const { fileName } = body as { fileName: string };

    if (!fileName) {
      return NextResponse.json({ error: "fileName required" }, { status: 400 });
    }

    // Generate URL for the file that's already on STACK
    const versionParam = Date.now();
    const pageBackgroundUrl = `${SETTINGS.apiUrl}/novels/${novelId}/banner/${fileName}?v=${versionParam}`;

    // Update database only
    const updated = await prisma.novel.update({
      where: { id: novelId },
      data: { pageBackgroundUrl },
    });

    const result = await enrichToFullNovel(updated);

    revalidateTags(novelTags.novel(novelId));
    revalidateTags(novelTags.list());

    return NextResponse.json(result, { status: 200 });
  }
);

