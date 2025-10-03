import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { enrichToFullNovel, getAllNovels, validateNovelData } from "./utils";
import { getQueryParams, revalidateTags, wrapRoute } from "../utils";
import prisma from "@/utils/db";
import {
  CreateNovelResponse,
  getNovelsQParamsSchema,
  GetNovelsResponse,
} from "@/contracts/novels";
import { novelTags } from "@/utils";

export const GET = wrapRoute(async (req) => {
  const options = getQueryParams(req, getNovelsQParamsSchema);

  const novels = (await getAllNovels(options)) satisfies GetNovelsResponse;

  return NextResponse.json(novels);
});

export const POST = wrapRoute(async (req) => {
  const novelData = await req.json();

  const validatedNovel = await validateNovelData(novelData);

  const id = validatedNovel.id;
  const data = {
    title: validatedNovel.title,
    authorId: validatedNovel.authorId,
    descriptionRich: validatedNovel.descriptionRich as unknown as object | undefined,
    snippet: validatedNovel.snippet,
    thumbnailUrl: validatedNovel.thumbnailUrl,
    pageBackgroundUrl: (validatedNovel as unknown as { pageBackgroundUrl?: string | null }).pageBackgroundUrl,
    foregroundOpacityPercent: (validatedNovel as unknown as { foregroundOpacityPercent?: number | null }).foregroundOpacityPercent ?? 80,
    foregroundBlurPercent: (validatedNovel as unknown as { foregroundBlurPercent?: number | null }).foregroundBlurPercent ?? 20,
    foregroundColorHex: (validatedNovel as unknown as { foregroundColorHex?: string | null }).foregroundColorHex,
    foregroundTextColorHex: (validatedNovel as unknown as { foregroundTextColorHex?: string | null }).foregroundTextColorHex,
    buttonBgColorHex: (validatedNovel as unknown as { buttonBgColorHex?: string | null }).buttonBgColorHex,
    tags: validatedNovel.tags,
    indexingTags: validatedNovel.indexingTags,
    externalUrls: validatedNovel.externalUrls,
    downloadUrls: validatedNovel.downloadUrls,
  };

  const newNovel = await (
    id
      ? prisma.novel.upsert({
          where: { id },
          create: data as unknown as Prisma.NovelCreateInput,
          update: data as unknown as Prisma.NovelUpdateInput,
        })
      : prisma.novel.create({ data: data as unknown as Prisma.NovelCreateInput })
  );


  revalidateTags(novelTags.list());

  const result = (await enrichToFullNovel(
    newNovel
  )) satisfies CreateNovelResponse;
  return NextResponse.json(result, { status: 201 });
});
