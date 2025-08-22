import { revalidateTags, wrapRoute } from "@/app/api/utils";
import { enrichToFullNovel, ensureCanUpdateNovel, ensureGetNovel } from "../../utils";
import { NovelTarget, UpdateNovelBannerParams } from "@/contracts/novels";
import {
  setNovelBanner,
  validateBanner,
} from "./utils";
import { NextResponse } from "next/server";
import { novelTags } from "@/utils";

export const PUT = wrapRoute<UpdateNovelBannerParams>(
  async (request, { params }) => {
    const { novelId } = await params;

    const novel = await ensureGetNovel(novelId);
    await ensureCanUpdateNovel(novel);

    const formData = await request.formData();
    const imageData = formData.get("banner") as File;

    const bannerFile = validateBanner(imageData);
    const bannerUrl = await setNovelBanner(novelId, bannerFile);

    const patchedNovel = {
      ...novel,
      bannerUrl,
    };
    const result = await enrichToFullNovel(patchedNovel);

    revalidateTags(novelTags.novel(novelId));
    revalidateTags(novelTags.list());

    return NextResponse.json(result, { status: 200 });
  }
);

export const GET = wrapRoute<NovelTarget>(async (request, { params }) => {
  const { novelId } = await params;

  const novel = await ensureGetNovel(novelId);

  return NextResponse.json(
    { bannerUrl: novel.bannerUrl },
    { status: 200 }
  );
});
