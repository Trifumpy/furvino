import { revalidateTags, wrapRoute } from "@/app/api/utils";
import { enrichToFullNovel, ensureCanUpdateNovel, ensureGetNovel } from "../../utils";
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
    const result = await enrichToFullNovel(patchedNovel);

    revalidateTags(novelTags.novel(novelId));
    revalidateTags(novelTags.list());

    return NextResponse.json(result, { status: 200 });
  }
);

export const GET = wrapRoute<NovelTarget>
  (async (request, { params }) => {
    const { novelId } = await params;

    const novel = await ensureGetNovel(novelId);

    const result = await enrichToFullNovel(novel);

    revalidateTags(novelTags.novel(novelId));

    return NextResponse.json(result);
  });

export const POST = wrapRoute<NovelTarget>(async (request, { params }) => {
  const { novelId } = await params;
  const novel = await ensureGetNovel(novelId);
  await ensureCanUpdateNovel(novel);

  const { url } = (await request.json()) as { url?: string };
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const res = await fetch(url, {
    headers: {
      Referer: url,
      Accept: "image/*;q=0.9",
      "User-Agent": "Mozilla/5.0 (compatible; FurvinoBot/1.0; +https://furvino.org)",
    },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: `Failed to fetch image: ${res.status}` }, { status: 400 });

  const ct = res.headers.get("content-type") || "image/jpeg";
  const ab = await res.arrayBuffer();
  const baseName = (() => { try { return new URL(url).pathname.split("/").pop() || "thumbnail"; } catch { return "thumbnail"; } })();
  const fileName = baseName.includes(".") ? baseName : `thumbnail.${ct.split("/")[1] || "jpg"}`;
  const file = new File([ab], fileName, { type: ct });
  const validated = validateThumbnail(file);
  const thumbnailUrl = await setNovelThumbnail(novelId, validated);

  const patchedNovel = { ...novel, thumbnailUrl };
  const result = await enrichToFullNovel(patchedNovel);
  revalidateTags(novelTags.novel(novelId));
  revalidateTags(novelTags.list());
  return NextResponse.json(result, { status: 200 });
});
