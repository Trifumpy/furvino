import { revalidateTags, wrapRoute } from "@/app/api/utils";
import { enrichNovel, ensureCanUpdateNovel, ensureGetNovel } from "../../utils";
import { NovelTarget, UpdateNovelThumbnailParams } from "@/contracts/novels";
import {
  setNovelThumbnail,
  validateThumbnail,
} from "./utils";
import { NextResponse } from "next/server";
import { novelTags } from "@/utils";

export const PUT = wrapRoute<UpdateNovelThumbnailParams>(
  async (request, { params }) => {
    const { novelId } = await params;

    const novel = await ensureGetNovel(novelId);
    await ensureCanUpdateNovel(novel);

    const formData = await request.formData();
    const thumbnailData = formData.get("thumbnail") as File;

    const thumbnailFile = validateThumbnail(thumbnailData);
    const thumbnailUrl = await setNovelThumbnail(novelId, thumbnailFile);

    const patchedNovel = {
      ...novel,
      thumbnailUrl,
    };
    const result = await enrichNovel(patchedNovel);

    revalidateTags(novelTags.novel(novelId));
    revalidateTags(novelTags.list());

    return NextResponse.json(result, { status: 200 });
  }
);

export const GET = wrapRoute<NovelTarget>(async (request, { params }) => {
  const { novelId } = await params;

  const novel = await ensureGetNovel(novelId);

  return NextResponse.json(
    { thumbnailUrl: novel.thumbnailUrl },
    { status: 200 }
  );
});
